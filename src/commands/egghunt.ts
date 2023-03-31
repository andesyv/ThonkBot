import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  ClientUser,
  EmbedBuilder,
  Guild,
  GuildChannel,
  GuildMember,
  Message,
  ReactionCollector,
  Snowflake,
  TextChannel,
  User
} from 'discord.js';
import { ICommandBase, IMessageCommand, ISlashCommand } from '../command.js';
import { Logger } from 'winston';
import { formatLeaderboardsString, logError, shuffle } from '../utils.js';
import BotClient from '../client.js';

interface MessageIdentifier {
  messageId: string;
  channelId: string;
}

// ---- Utility -------------

const randomRange = (min: number, max: number) =>
  Math.random() * (max - min) + min;

// f(x) = ax^2 + b, where a and b are scaled so f(0) = 10 and f(9) = 100
const upperMessageBound = (eggCount: number): number =>
  Math.round(1.11 * eggCount * eggCount + 10);

const getNickname = async (user: User | GuildMember, guild?: Guild) => {
  if (user instanceof GuildMember) return user.nickname ?? user.user.username;

  const member = await guild?.members.fetch(user);
  return member?.nickname ?? user.username;
};

const nullToUndefined = <T>(t: T | null): T | undefined =>
  t === null ? undefined : t;

const findRandomMessage = async (
  guild: Guild,
  clientUser: ClientUser,
  eggCount: number
): Promise<Message<boolean> | undefined> => {
  const channels = shuffle(
    (await guild.channels.fetch())
      .filter(
        (channel): channel is TextChannel =>
          channel.isTextBased() && channel instanceof TextChannel
      )
      .map((channel) => channel)
  );

  for (const channel of channels) {
    const messages = shuffle(
      (
        await channel.messages.fetch({ limit: upperMessageBound(eggCount) })
      ).map((message) => message)
    );

    // Find a random message that hasn't already been part of the easter egg hunt
    for (const message of messages) {
      if (message.reactions.cache.size <= 0) return message;
    }
  }
  return undefined;
};

// ---- Embeds -------------

const gameStartEmbed = (
  user: string | undefined,
  thonkbot_avatar_url: string | undefined
): EmbedBuilder =>
  new EmbedBuilder({
    title: ':egg: Egg hunt! :egg:',
    description:
      user !== undefined
        ? `${user} has started an egg hunt! `
        : 'An egg hunt has been initiated!',
    timestamp: Date.now()
  })
    .setColor('#ffa500')
    // .setThumbnail(
    //   'https://upload.wikimedia.org/wikipedia/commons/8/8b/Kelch_Rocaille_Egg.jpg'
    // )
    .setFooter({
      text: 'Egg hunt!',
      iconURL: thonkbot_avatar_url
    })
    .setFields([
      {
        name: 'Rules',
        value: `*ThonkBot™* has placed a hidden egg in the form of an :egg: emoji among a random message. Click the emoji to claim the egg! After an egg has been claimed, another one will be planted after 5-60 minutes until 10 eggs have been discovered or nobody has discovered an egg for a while.

  Eggs can be placed among the first 100 mesages of any text channel. Only *one* person can claim an egg.
  
  Happy hunting!`
      }
    ]);

const formatScores = async (
  scores: Map<string, number>,
  guild: Guild
): Promise<string> =>
  formatLeaderboardsString(
    await Promise.all(
      Array.from(scores, ([id, score]) => ({
        id,
        score
      })).map(async ({ id, score }) => ({
        user: await getNickname(await guild.members.fetch(id), guild),
        score
      }))
    ),
    'eggs'
  );

const userFoundEggEmbed = async (
  user: User,
  game: Game
): Promise<EmbedBuilder> => {
  const guild = await game.guild();
  return new EmbedBuilder({
    description: `${await getNickname(user, guild)} found an egg!`
  }).setFields({
    name: 'Current scores',
    value: await formatScores(game.scores, guild)
  });
};

const gameFinishedEmbed = async (
  game: Game,
  user?: User
): Promise<EmbedBuilder> => {
  const guild = await game.guild();
  return new EmbedBuilder({
    title: ':egg: The egg hunt is over! :egg:',
    description:
      user !== undefined
        ? `${await getNickname(user, guild)} found the last egg.`
        : undefined
  })
    .setColor('#ffa500')
    .setFields({
      name: 'Final scores',
      value: await formatScores(game.scores, guild)
    });
};

// ---- Game -------------

class Game {
  client: BotClient;
  logger: Logger;
  guildId: Snowflake;
  gameChannelId: Snowflake;
  eggCount: number;
  nextRoundTimeout?: NodeJS.Timeout;
  collector?: ReactionCollector;
  scores: Map<string, number>;
  endTimeout?: NodeJS.Timeout;
  cleanupMessages: MessageIdentifier[];

  constructor(client: BotClient, logger: Logger, channel: GuildChannel) {
    this.client = client;
    this.logger = logger;
    this.guildId = channel.guildId;
    this.gameChannelId = channel.id;
    this.eggCount = 0;
    this.scores = new Map();
    this.cleanupMessages = [];

    this.initRound(channel.guild);
  }

  async initRound(guild: Guild) {
    try {
      this.collector = await placeEgg(this.client, guild, this.eggCount);
      this.collector.on('collect', (_reaction, user) => {
        eggFound(this, user);
      });
      this.cleanupMessages.push({
        messageId: this.collector.message.id,
        channelId: this.collector.message.channelId
      });

      this.resetEndTimer();
    } catch (e) {
      logError(e, this.logger);
    }
  }

  guild(): Promise<Guild> {
    return this.client.guilds.fetch(this.guildId);
  }

  async controlChannel(): Promise<TextChannel | undefined> {
    const channel = await (
      await this.guild()
    ).channels.fetch(this.gameChannelId);
    return channel instanceof TextChannel ? channel : undefined;
  }

  resetEndTimer() {
    clearTimeout(this.endTimeout);

    this.endTimeout = setTimeout(async () => {
      try {
        finishGame(this);
        this.logger.log('info', 'Egg hunt completed successfully!');
      } catch (e) {
        logError(e, this.logger);
      }
    }, 4 * 60 * 60 * 1000);
  }
}

const placeEgg = async (
  client: BotClient,
  guild: Guild,
  eggCount: number
): Promise<ReactionCollector> => {
  if (client.user === null) throw new Error("BotClient's user is null somehow");

  const message = await findRandomMessage(guild, client.user, eggCount);
  if (message === undefined)
    throw new Error('Could not find any applicable messages for an egg!');

  await message.react('🥚');
  const collector = message.createReactionCollector({
    filter: (reaction) => reaction.emoji.name === '🥚',
    maxUsers: 1
  });
  return collector;
};

const eggFound = async (game: Game, user: User) => {
  try {
    game.collector = undefined;
    game.eggCount += 1;
    game.scores.set(user.id, (game.scores.get(user.id) ?? 0) + 1);

    if (10 <= game.eggCount) {
      finishGame(game, user);
    } else {
      const channel = await game.controlChannel();
      channel?.send({ embeds: [await userFoundEggEmbed(user, game)] });

      // Between 5 and 60 minutes
      const cooldown = randomRange(5, 60) * 60 * 1000;

      game.nextRoundTimeout = setTimeout(async () => {
        try {
          const guild = await game.guild();
          game.initRound(guild);
        } catch (e) {
          logError(e, game.logger);
        }
      }, cooldown);
    }
  } catch (e) {
    logError(e, game.logger);
  }
};

const finishGame = async (game: Game, user?: User) => {
  // Node.js manages to magically call the endTimeout even after the game has gone out of scope.
  // Oh boy how I love object-based languages...
  clearTimeout(game.endTimeout);

  const channel = await game.controlChannel();
  await channel?.send({ embeds: [await gameFinishedEmbed(game, user)] });

  // Cleanup
  const guild = await game.guild();
  const cleanupMessages = new Array(...game.cleanupMessages);
  games.delete(game.guildId);

  // Remove reactions at the end as it has a high probability of failing
  // (if the server have not given the bot sufficient rights)
  for (const { messageId, channelId } of cleanupMessages) {
    const channel = await guild.channels.fetch(channelId);
    if (channel instanceof TextChannel) {
      const message = await channel.messages.fetch(messageId);
      await message.reactions.removeAll();
    }
  }
};

const games: Map<string, Game> = new Map();

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

      games.set(
        interaction.guild.id,
        new Game(client, logger, interaction.channel)
      );

      const client_avatar_url = nullToUndefined(client.user?.avatarURL());
      const author = await getNickname(interaction.user, interaction.guild);
      return interaction.reply({
        embeds: [gameStartEmbed(author, client_avatar_url)]
      });
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['easter', 'easterhunt', 'eggs'],
  handleMessage: async (message, client, logger) => {
    try {
      if (message.guild === null) throw Error('Guild is null');

      if (!(message.channel instanceof TextChannel))
        return message.reply(
          'Command is only available in a guild text channel'
        );

      games.set(message.guild.id, new Game(client, logger, message.channel));

      const client_avatar_url = nullToUndefined(client.user?.avatarURL());
      const author = await getNickname(message.author, message.guild);
      return message.reply({
        embeds: [gameStartEmbed(author, client_avatar_url)]
      });
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default egghunt;
