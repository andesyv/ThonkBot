import { SlashCommandBuilder } from '@discordjs/builders';
import {
  Channel,
  ChannelType,
  ChatInputCommandInteraction,
  Guild,
  GuildChannel,
  GuildMember,
  ReactionCollector,
  Snowflake,
  TextChannel,
  User
} from 'discord.js';
import { ICommandBase, IMessageCommand, ISlashCommand } from '../command.js';
import { Logger } from 'winston';
import { logError } from '../utils.js';
import BotClient from '../client.js';

class Game {
  client: BotClient;
  logger: Logger;
  guild_id: Snowflake;
  game_channel_id: Snowflake;
  egg_count: number;
  next_round_timeout?: NodeJS.Timeout;
  collector?: ReactionCollector;

  constructor(client: BotClient, logger: Logger, channel: GuildChannel) {
    this.client = client;
    this.logger = logger;
    this.guild_id = channel.guildId;
    this.game_channel_id = channel.id;
    this.egg_count = 0;

    this.init_round(channel.guild);
  }

  async init_round(guild: Guild) {
    this.collector = await place_egg(guild, this.logger);
    this.collector.on('collect', (_reaction, user) => {
      this.egg_found(user);
    });

    // Build "game started" embed
  }

  async egg_found(user: User) {
    this.logger.log('info', 'Egg was found!');

    this.collector = undefined;

    // TODO: Increment user score

    // TODO: Build "user found egg" embed
    const guild = await this.client.guilds.fetch(this.guild_id);
    const channel = await guild.channels.fetch(this.game_channel_id);
    if (channel instanceof TextChannel)
      channel.send(`${await getNickname(user, guild)} found an egg!`);

    // Between 5 and 60 minutes
    const cooldown = 3 * 1000; // randomRange(5, 60) * 60 * 1000;

    this.next_round_timeout = setTimeout(async () => {
      try {
        const guild = await this.client.guilds.fetch(this.guild_id);
        this.init_round(guild);
      } catch (e) {
        logError(e, this.logger);
      }
    }, cooldown);
  }
}

const randomRange = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const random_index = <T>(array: T[]): T =>
  array[Math.floor(Math.random() * array.length)];

const getNickname = async (user: User, guild: Guild) => {
  const member = await guild.members.fetch(user);
  return member.nickname ?? user.username;
};

const place_egg = async (
  guild: Guild,
  logger: Logger
): Promise<ReactionCollector> => {
  const channel = random_index(
    (await guild.channels.fetch())
      .filter(
        (channel): channel is TextChannel =>
          channel.isTextBased() && channel instanceof TextChannel
      )
      .map((channel) => channel)
  );
  const message = random_index(
    await (
      await channel.messages.fetch({ limit: 10 })
    ).map((message) => message)
  );
  await message.react('🥚');
  logger.log('info', 'Egg has been placed!');
  const collector = message.createReactionCollector({
    filter: (reaction) => reaction.emoji.name === '🥚',
    maxUsers: 1
  });
  return collector;
};

const games: Record<string, Game> = {};

// const buildEmbed = (game: Game, user: string): EmbedBuilder => {
//   const game_won = gameIsWon(game);
//   const game_lost = !game_won && gameIsOver(game);

//   return new EmbedBuilder({
//     title: game_won
//       ? `:tada: You won the ${game.word.length} letter wordle game! :tada:`
//       : game_lost
//       ? `Wordle game lost. :( The word was ${game.word}`
//       : `Wordle game! (${game.word.length} letters)`,
//     description:
//       game.guesses[game.guesses.length - 1] === game.word
//         ? `${user} guessed the correct word, which was *${game.word}*! Congrats!`
//         : game.guesses.length === 1
//         ? `${user} started a new wordle game with ${game.word.length} letters and guessed *${game.guesses[0]}*!`
//         : `${user} guessed the word *${
//             game.guesses[game.guesses.length - 1]
//           }*!`,
//     footer:
//       game_won || game_lost
//         ? undefined
//         : {
//             text: `This wordle game will last until ${game.max_guesses} attempts has been reached, the game has been won or for 10 more minutes.`
//           }
//   });
// };

// const buildComponents = (game: Game): ActionRowBuilder<ButtonBuilder>[] => {
//   const game_lost = !gameIsWon(game) && gameIsOver(game);
//   let btn_id = 0;
//   const total_indices_found = new Set<number>();
//   const components = game.guesses.map((guess) => {
//     const guessed_letters = new Set<string>();
//     const row = new ActionRowBuilder<ButtonBuilder>({
//       components: Array.from(guess).map((c, i) => {
//         let style = ButtonStyle.Secondary;
//         const index = game.word.indexOf(c);
//         // If guess[index] === c, it means there's a better alternative later in the guess. Skip highlihting this letter
//         if (
//           -1 < index &&
//           !guessed_letters.has(c) &&
//           (i === index || guess[index] !== c)
//         ) {
//           if (index === i) total_indices_found.add(i);
//           style = index === i ? ButtonStyle.Success : ButtonStyle.Primary;
//           guessed_letters.add(c);
//         }
//         return new ButtonBuilder({
//           customId: `placeholder_button_${++btn_id}`,
//           label: c,
//           disabled: true,
//           style: style
//         });
//       })
//     });
//     return row;
//   });
//   if (game_lost) {
//     components.push(
//       new ActionRowBuilder({
//         components: Array.from(game.word).map(
//           (c, i) =>
//             new ButtonBuilder({
//               customId: `placeholder_button_${++btn_id}`,
//               label: c,
//               disabled: true,
//               style: total_indices_found.has(i)
//                 ? ButtonStyle.Success
//                 : ButtonStyle.Danger
//             })
//         )
//       })
//     );
//   }
//   return components;
// };

const egghunt: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('egghunt')
    .setDescription('Initiate an egg hunt'),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: BotClient,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (interaction.guild === null) throw Error('Guild is null');

      if (!(interaction.channel instanceof TextChannel))
        return interaction.reply({
          content: 'Command is only available in a guild text channel',
          ephemeral: true
        });

      games[interaction.guild.id] = new Game(
        client,
        logger,
        interaction.channel
      );

      // const embed = await sendPersonalSpook(target, author);
      return interaction.reply('ok!');
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['easter', 'easterhunt', 'egg'],
  handleMessage: async (message, client, logger) => {
    try {
      if (message.guild === null) throw Error('Guild is null');

      if (!(message.channel instanceof TextChannel))
        return message.reply(
          'Command is only available in a guild text channel'
        );

      games[message.guild.id] = new Game(client, logger, message.channel);

      // const embed = await sendPersonalSpook(target, author);
      return message.reply('ok!');
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default egghunt;
