import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  ClientUser,
  EmbedBuilder,
  Guild,
  GuildChannel,
  GuildMember,
  Message,
  NonThreadGuildBasedChannel,
  PermissionsBitField,
  ReactionCollector,
  Snowflake,
  TextChannel,
  User
} from 'discord.js';
import { ICommandBase, IMessageCommand, ISlashCommand } from '../command.js';
import { Logger } from 'winston';
import {
  formatLeaderboardsString,
  logError,
  millisecondsToDuration,
  shuffle
} from '../utils.js';
import BotClient from '../client.js';
import {
  getUserPointsEntry,
  updatePoints,
  wrapDBThrowable
} from '../dbutils.js';
import { formatDuration } from 'date-fns';

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

const isNotNull = <T>(t: T | null | undefined): t is T =>
  t !== undefined || t !== null;

const isTextChannel = (
  channel: NonThreadGuildBasedChannel | undefined | null
): channel is TextChannel =>
  isNotNull(channel) && channel.isTextBased() && channel instanceof TextChannel;

const canUseChannel = (channel: TextChannel, bot: GuildMember) => {
  const permissions = channel.permissionsFor(bot.id);
  return (
    permissions !== null &&
    permissions.has([
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.AddReactions
    ])
  );
};

const findRandomMessage = async (
  guild: Guild,
  clientUser: ClientUser,
  eggCount: number
): Promise<Message<boolean> | undefined> => {
  const messageBound = upperMessageBound(eggCount);
  const member = await guild.members.fetch(clientUser.id);
  const channels = shuffle(
    (await guild.channels.fetch())
      .filter(isTextChannel)
      .filter((channel) => canUseChannel(channel, member))
      .map((channel) => channel)
  );

  for (const channel of channels) {
    const messages = shuffle(
      (await channel.messages.fetch({ limit: messageBound })).map(
        (message) => message
      )
    );

    // Find a random message that hasn't already been part of the easter egg hunt
    for (const message of messages) {
      const reactions = await message.reactions.resolve('🥚')?.fetch();
      if (reactions?.count ?? 0 > 0) continue;

      return message;
    }
  }
  return undefined;
};

const incrementEggs = async (member: GuildMember) => {
  const { points, eggs } = await getUserPointsEntry(member);
  updatePoints(member, points, eggs + 1);
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
        value: `*ThonkBot™* has placed a hidden egg in the form of an :egg: emoji among a random message. Click the emoji to claim the egg! After an egg has been claimed, another one will be planted after 5-120 seconds until 10 eggs have been discovered or nobody has discovered an egg within an hour.

  Eggs can be placed among the last 100 mesages of any text channel. Initial eggs are guaranteed to be placed closer to the last message, but may progressively be placed further away as more eggs are found. Only *one* person can claim an egg. (Egg emojis are cleaned up at the end of the game)
  
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
        score: [{ name: 'eggs', value: score }]
      }))
    )
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
  readonly timeoutSeconds = 1 * 60 * 60 * 1000; // 1 hour
  endTimeoutStartDate: number = 0;
  cleanupMessages: MessageIdentifier[];

  constructor(client: BotClient, logger: Logger, channel: GuildChannel) {
    this.client = client;
    this.logger = logger;
    this.guildId = channel.guildId;
    this.gameChannelId = channel.id;
    this.eggCount = 0;
    this.scores = new Map();
    this.cleanupMessages = [];
  }

  async initRound(guild: Guild) {
    try {
      this.collector = await placeEgg(this.client, guild, this.eggCount);
      this.logger.log('info', 'Placed a hidden egg');
      this.collector.on('collect', (_reaction, user) => {
        this.eggFound(user);
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

  async eggFound(user: User) {
    try {
      this.collector = undefined;
      this.eggCount += 1;
      this.scores.set(user.id, (this.scores.get(user.id) ?? 0) + 1);

      wrapDBThrowable(incrementEggs)(
        await (await this.guild()).members.fetch(user.id)
      );

      if (10 <= this.eggCount) {
        this.finishGame(user);
      } else {
        const channel = await this.controlChannel();
        channel?.send({ embeds: [await userFoundEggEmbed(user, this)] });

        // Between 5 and 120 seconds
        const cooldown = randomRange(5, 120) * 1000;

        this.nextRoundTimeout = setTimeout(async () => {
          try {
            const guild = await this.guild();
            this.initRound(guild);
          } catch (e) {
            logError(e, this.logger);
          }
        }, cooldown);
      }
    } catch (e) {
      logError(e, this.logger);
    }
  }

  async finishGame(user?: User) {
    // Node.js manages to magically call the endTimeout even after the game has gone out of scope.
    // Oh boy how I love garbage collected languages...
    clearTimeout(this.endTimeout);

    const channel = await this.controlChannel();
    await channel?.send({ embeds: [await gameFinishedEmbed(this, user)] });

    // Cleanup
    const guild = await this.guild();
    const cleanupMessages = new Array(...this.cleanupMessages);
    games.delete(this.guildId);

    // Remove reactions at the end as it has a high probability of failing
    // (if the server have not given the bot sufficient rights)
    for (const { messageId, channelId } of cleanupMessages) {
      const channel = await guild.channels.fetch(channelId);
      if (channel instanceof TextChannel) {
        const message = await channel.messages.fetch(messageId);
        await message.reactions.resolve('🥚')?.remove();
      }
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
    this.endTimeoutStartDate = Date.now();
    if (this.endTimeout !== undefined) {
      this.endTimeout.refresh();
      return;
    }

    this.endTimeout = setTimeout(async () => {
      try {
        this.finishGame();
        this.logger.log('info', 'Egg hunt completed successfully!');
      } catch (e) {
        logError(e, this.logger);
      }
    }, this.timeoutSeconds);
  }
}

const getFormattedTimeLeft = (game?: Game): string => {
  if (game === undefined) return '¯\\_(ツ)_/¯';

  const isEstimate = game.collector === undefined;

  const msLeft = Math.max(
    game.timeoutSeconds -
      (isEstimate ? 0 : Date.now() - game.endTimeoutStartDate),
    0
  );
  return `${isEstimate ? '~' : ''}${formatDuration(millisecondsToDuration(msLeft))}`;
};

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

      if (games.has(interaction.guild.id))
        return interaction.reply(
          `You cannot start another egg hunt while an egg hunt is currently ongoing. Time left of the current game: ${getFormattedTimeLeft(games.get(interaction.guild.id))}`
        );

      await interaction.deferReply();

      let game = new Game(client, logger, interaction.channel);
      games.set(interaction.guild.id, game);

      await game.initRound(interaction.guild);

      const client_avatar_url = nullToUndefined(client.user?.avatarURL());
      const author = await getNickname(interaction.user, interaction.guild);
      return interaction.editReply({
        embeds: [gameStartEmbed(author, client_avatar_url)]
      });
    } catch (e) {
      logError(e, logger);
      return interaction.reply('Command failed. :(');
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

      if (games.has(message.guild.id))
        return message.reply(
          `You cannot start another egg hunt while an egg hunt is currently ongoing. Time left of the current game: ${getFormattedTimeLeft(games.get(message.guild.id))}`
        );

      let game = new Game(client, logger, message.channel);
      games.set(message.guild.id, game);

      await game.initRound(message.guild);

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
