import { SlashCommandBuilder } from '@discordjs/builders';
import {
  Client,
  Message,
  Guild,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChatInputCommandInteraction
} from 'discord.js';
import { ICommandBase, ISlashCommand } from '../command.ts';
import { Logger } from 'winston';
import { db } from '../dbutils.ts';
import { default as axios } from 'axios';
import { getNickname, logError, splitToChunks } from '../utils.ts';

interface DictEntry {
  word: string;
  length: number;
}

const DICTIONARY_URL =
  'https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json';

export const initWords = async (client: Client, logger: Logger) => {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS words (
      word TEXT PRIMARY KEY,
      length INTEGER
    );`
  ).run();

  const tableIsEmpty =
    db.prepare('SELECT * FROM words LIMIT 1').get() === undefined;
  if (tableIsEmpty) {
    logger.info('Rebuilding dictionary database');
    const { data } = await axios.get<Record<string, number>>(DICTIONARY_URL, {
      responseType: 'json'
    });

    const insert = db.prepare(
      'INSERT INTO words(word, length) VALUES (@word, @length);'
    );
    db.transaction((entries: DictEntry[]) => {
      for (const entry of entries) insert.run(entry);
    })(
      Object.entries(data).map(
        ([key]): DictEntry => ({ word: key, length: key.length })
      )
    );
    logger.info('Finished building dictionary database');
  }
};

interface Game {
  word: string;
  guesses: string[];
  max_guesses: number;
  timeout?: NodeJS.Timeout;
}

const games: Record<string, Game | undefined> = {};

const resetTimeout = (id: string) => {
  const game = games[id];
  if (game === undefined) return;

  if (game.timeout) clearTimeout(game.timeout);
  game.timeout = setTimeout(
    () => {
      games[id] = undefined;
    },
    10 * 60 * 1000
  );
};

const initateNewGame = (game_id: string, length = 5): Game => {
  const random_word = db
    .prepare<
      { length: number },
      DictEntry
    >('SELECT * FROM words WHERE length = @length ORDER BY RANDOM() LIMIT 1')
    .get({ length: length });
  if (random_word && typeof random_word.word === 'string') {
    const game = {
      word: random_word.word,
      guesses: [],
      max_guesses: 6
    };
    games[game_id] = game;
    resetTimeout(game_id);
    return game;
  } else {
    throw new Error(`Failed to find word with length of ${length}`);
  }
};

const gameIsWon = (game: Game): boolean =>
  game.guesses[game.guesses.length - 1] === game.word;
const gameIsOver = (game: Game): boolean =>
  gameIsWon(game) || game.guesses.length === game.max_guesses;

const isWord = (word: string): boolean =>
  db
    .prepare('SELECT * FROM words WHERE word = @word LIMIT 1')
    .get({ word: word }) !== undefined;

const buildEmbed = (game: Game, user: string): EmbedBuilder => {
  const game_won = gameIsWon(game);
  const game_lost = !game_won && gameIsOver(game);

  return new EmbedBuilder({
    title: game_won
      ? `:tada: You won the ${game.word.length} letter wordle game! :tada:`
      : game_lost
        ? `Wordle game lost. :( The word was ${game.word}`
        : `Wordle game! (${game.word.length} letters)`,
    description:
      game.guesses[game.guesses.length - 1] === game.word
        ? `${user} guessed the correct word, which was *${game.word}*! Congrats!`
        : game.guesses.length === 1
          ? `${user} started a new wordle game with ${game.word.length} letters and guessed *${game.guesses[0]}*!`
          : `${user} guessed the word *${
              game.guesses[game.guesses.length - 1]
            }*!`,
    footer:
      game_won || game_lost
        ? undefined
        : {
            text: `This wordle game will last until ${game.max_guesses} attempts has been reached, the game has been won or for 10 more minutes.`
          }
  });
};

const buildComponents = (game: Game): ActionRowBuilder<ButtonBuilder>[] => {
  const game_lost = !gameIsWon(game) && gameIsOver(game);
  let btn_id = 0;
  const total_indices_found = new Set<number>();
  const components = game.guesses.map((guess) => {
    const guessed_letters = new Set<string>();
    const row = new ActionRowBuilder<ButtonBuilder>({
      components: Array.from(guess).map((c, i) => {
        let style = ButtonStyle.Secondary;
        const index = game.word.indexOf(c);
        // If guess[index] === c, it means there's a better alternative later in the guess. Skip highlihting this letter
        if (
          -1 < index &&
          !guessed_letters.has(c) &&
          (i === index || guess[index] !== c)
        ) {
          if (index === i) total_indices_found.add(i);
          style = index === i ? ButtonStyle.Success : ButtonStyle.Primary;
          guessed_letters.add(c);
        }
        return new ButtonBuilder({
          customId: `placeholder_button_${++btn_id}`,
          label: c,
          disabled: true,
          style: style
        });
      })
    });
    return row;
  });
  if (game_lost) {
    components.push(
      new ActionRowBuilder({
        components: Array.from(game.word).map(
          (c, i) =>
            new ButtonBuilder({
              customId: `placeholder_button_${++btn_id}`,
              label: c,
              disabled: true,
              style: total_indices_found.has(i)
                ? ButtonStyle.Success
                : ButtonStyle.Danger
            })
        )
      })
    );
  }
  return components;
};

const wordle: ICommandBase & ISlashCommand = {
  data: new SlashCommandBuilder()
    .setName('wordle')
    .setDescription('Play a round of the famous word-game with your friends')
    .addStringOption((opt) =>
      opt.setName('guess').setDescription('Your guess').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('length')
        .setDescription(
          'The desired length of the word. (only used when starting a new game)'
        )
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(5)
    ),
  init: initWords,
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const guess = interaction.options.getString('guess', true).toLowerCase();
      const word_len = interaction.options.getInteger('length') ?? 5;

      if (interaction.guild instanceof Guild) {
        const user = getNickname(interaction.member, interaction.user);
        let game = games[interaction.guild.id];
        try {
          if (game === undefined)
            game = initateNewGame(interaction.guild.id, word_len);
        } catch (e) {
          await interaction.reply({
            content:
              "Could'nt find a word to start a wordle game. Try a different word-length.",
            flags: 'Ephemeral'
          });
          throw e;
        }

        if (guess.length !== game.word.length) {
          return interaction.reply({
            content: `Your guessed word has to be of the same length as the secret word, which is ${game.word.length}. I won't count this guess.`,
            flags: 'Ephemeral'
          });
        } else if (game.guesses.includes(guess)) {
          return interaction.reply({
            content:
              "Why would you spend your precious guess on a word that's already been guessed? I won't count this one.",
            flags: 'Ephemeral'
          });
        } else if (!isWord(guess)) {
          return interaction.reply({
            content:
              "Sorry, unfortunately my database don't count that as a word. Please try another one. I won't count that guess.",
            flags: 'Ephemeral'
          });
        }
        game.guesses.push(guess);

        const embed = buildEmbed(game, user);
        const components = buildComponents(game);

        // Reset timer or delete ongoing game
        if (gameIsOver(game)) {
          games[interaction.guild.id] = undefined;
        } else {
          resetTimeout(interaction.guild.id);
        }

        if (5 < components.length) {
          const chunks = splitToChunks(components, 5);
          await interaction.reply({
            embeds: [embed],
            components: chunks.shift()
          });
          for (const chunk of chunks) {
            const reply = await interaction.fetchReply();
            if (reply instanceof Message) {
              reply.reply({ components: chunk });
            } else {
              throw new Error('Bot reply was not a real message somehow');
            }
          }
        } else {
          return interaction.reply({ embeds: [embed], components: components });
        }
      } else {
        // TODO: Could have DM games aswell...
        return interaction.reply('Command is only available in a server. :(');
      }
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        flags: 'Ephemeral'
      });
    }
  }
};

export default wordle;
