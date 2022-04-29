import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  Client,
  Message,
  MessageEmbed,
  GuildChannel,
  User,
  TextChannel,
  GuildMember,
  MessageOptions,
  MessageAttachment
} from 'discord.js';
import { ICommandBase, IMessageCommand, ISlashCommand } from '../command';
import { Logger } from 'winston';
import { db, wrapDBThrowable } from '../dbutils';
import * as path from 'path';
import { logError } from '../utils';
import { scheduleJob } from 'node-schedule';

interface DBEntry {
  id: string;
  gid: string;
  type: number;
}

export const initTable = async (logger: Logger) => {
  try {
    wrapDBThrowable(() => {
      db.prepare(
        `CREATE TABLE IF NOT EXISTS wednesdays (
          id TEXT NOT NULL,
          gid TEXT NOT NULL,
          type INTEGER NOT NULL,
          PRIMARY KEY (id, gid, type)
        );`
      ).run();
    });
  } catch (e) {
    logError(e, logger);
  }
};

const removeEntry = (id: string, gid: string, type: number) => {
  db.prepare(
    'DELETE FROM wednesdays WHERE id = @id AND gid = @gid AND type = @type'
  ).run({
    id: id,
    gid: gid,
    type: type
  });
};

const toggleId = (id: string, gid: string, type: number): boolean => {
  // Only filtering on ids for users so user ids are shared between guilds
  const q =
    type === 0
      ? db.prepare('SELECT * FROM wednesdays WHERE id = @id AND gid = @gid')
      : db.prepare('SELECT * FROM wednesdays WHERE id = @id');
  const q_res: DBEntry | undefined = q.get({ id: id, gid: gid });
  const exists = q_res !== undefined;
  if (exists) {
    removeEntry(id, gid, type);
  } else {
    db.prepare(
      'INSERT INTO wednesdays(id, gid, type) VALUES(@id, @gid, @type)'
    ).run({
      id: id,
      gid: gid,
      type: type
    });
  }
  return !exists;
};

const toggleGuild = (channel: GuildChannel) =>
  wrapDBThrowable(toggleId)(channel.id, channel.guild.id, 0);
const toggleUser = (user: GuildMember) =>
  wrapDBThrowable(toggleId)(user.id, user.guild.id, 1);

const buildMessageContent = (): MessageOptions => {
  const file = path.join(process.cwd(), 'data', 'wednesday.jpg');
  const attachment = new MessageAttachment(file);
  let embed = new MessageEmbed().setImage(
    `attachment://${path.basename(file)}`
  );
  return {
    embeds: [embed],
    files: [attachment]
  };
};

const getAll = wrapDBThrowable((): DBEntry[] =>
  db.prepare('SELECT * FROM wednesdays').all()
);

const notifyWednesdays = async (client: Client, logger: Logger) => {
  logger.log('info', "It's wednesday my dudes!");
  try {
    const message = buildMessageContent();
    const ids = getAll();

    for (let { id, gid, type } of ids) {
      const guild = await client.guilds.fetch(gid);
      if (!guild.available) continue;

      if (type === 0) {
        const channel = await guild.channels.fetch(id);
        if (channel instanceof TextChannel) {
          await channel.send(message);
        } else {
          // Remove stale records
          logger.log(
            'info',
            `Removing { id: ${id}, gid: ${gid}, type: ${type}} as it was stale`
          );
          removeEntry(id, gid, 0);
        }
      } else if (type === 1) {
        const users = await guild.members.fetch();
        const user = users.get(id);
        if (user) {
          if (user.presence?.status !== 'dnd') await user.send(message);
        } else {
          // Remove stale records
          logger.log(
            'info',
            `Removing { id: ${id}, gid: ${gid}, type: ${type}} as it was stale`
          );
          removeEntry(id, gid, 1);
        }
      }
    }
  } catch (e) {
    logError(e, logger);
  }
};

/**
 * Attempts to look through all the guilds of the bot in search for a common guild with the user
 * @note This operation is very slow
 * @returns A GuildMember instance if a common guild was found, undefined if not
 */
const fetchGuildMember = async (
  client: Client,
  user: User
): Promise<GuildMember | undefined> => {
  const guilds = await client.guilds.fetch();

  for (let [_, resolvable] of guilds) {
    const guild = await resolvable.fetch();
    if (guild.available) {
      const members = await guild.members.fetch({ limit: 200 });
      const member = members.get(user.id);
      if (member) return member;
    }
  }
  return undefined;
};

const wednesdayreminder: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('remindwednesdays')
    .setDescription('Toggle a reminder message for wednesdays'),
  init: async (client, logger) => {
    await initTable(logger);
    client.jobs.push(
      scheduleJob('0 12 * * 3', () => notifyWednesdays(client, logger))
    );
    logger.log('info', 'Setup wednesday notifier job');
  },
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (interaction.guild) {
        if (interaction.channel instanceof TextChannel) {
          const enabled = toggleGuild(interaction.channel);
          return interaction.reply(
            enabled
              ? "I'll be sure to let everyone know!"
              : "Okay, I'll stop reminding everyone. :("
          );
        } else {
          return interaction.reply({
            content:
              'Command currently only works in text channels or direct messages :/',
            ephemeral: true
          });
        }
      } else {
        await interaction.deferReply();
        const member = await fetchGuildMember(client, interaction.user);
        if (member) {
          const enabled = toggleUser(member);
          return interaction.editReply(
            enabled
              ? "Okay, I'll be sure to let you know!"
              : "Alright, I won't let you know anymore."
          );
        } else {
          logger.log(
            'error',
            `Failed to find common channel with user: ${interaction.user.tag} (${interaction.user.id})`
          );
          return interaction.editReply(
            "You have to share a guild with me to use that command, and I could'nt find one. :/"
          );
        }
      }
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['wednesdayremind', 'wednesday', 'wednesdays'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (message.guild) {
        if (message.channel instanceof TextChannel) {
          const enabled = toggleGuild(message.channel);
          return message.channel.send(
            enabled
              ? "I'll be sure to let everyone know!"
              : "Okay, I'll stop reminding everyone. :("
          );
        } else {
          return message.channel.send(
            'Command currently only works in text channels or direct messages :/'
          );
        }
      } else {
        // Apparantly this code never gets run because the bot won't respond to dms anymore (except for interactions)
        const member = await fetchGuildMember(client, message.author);
        if (member) {
          const enabled = toggleUser(member);
          return message.channel.send(
            enabled
              ? "Okay, I'll be sure to let you know!"
              : "Alright, I won't let you know anymore."
          );
        } else {
          logger.log(
            'error',
            `Failed to find common channel with user: ${message.author.tag} (${message.author.id})`
          );
          return message.channel.send(
            "You have to share a guild with me to use that command, and I could'nt find one. :/"
          );
        }
      }
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default wednesdayreminder;
