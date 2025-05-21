import { SlashCommandBuilder } from '@discordjs/builders';
import {
  Client,
  Message,
  TextChannel,
  AttachmentBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  MessageCreateOptions
} from 'discord.js';
import { ICommandBase, IMessageCommand, ISlashCommand } from '../command.ts';
import { Logger } from 'winston';
import {
  db,
  initRecordTable,
  RecordDBEntry,
  RecordType,
  removeRecordEntry,
  toggleGuildRecord,
  toggleUserRecord,
  wrapDBThrowable
} from '../dbutils.ts';
import * as path from 'path';
import { fetchGuildMember, getDataFolderPath, logError } from '../utils.ts';
import { RecurrenceRule, scheduleJob } from 'node-schedule';

const buildMessageContent = async (): Promise<MessageCreateOptions> => {
  const file = path.join(await getDataFolderPath(), 'wednesday.jpg');
  const attachment = new AttachmentBuilder(file);
  const embed = new EmbedBuilder({
    image: { url: `attachment://${path.basename(file)}` }
  });
  return {
    embeds: [embed],
    files: [attachment]
  };
};

const getAll = wrapDBThrowable((): RecordDBEntry[] =>
  db.prepare<unknown[], RecordDBEntry>('SELECT * FROM wednesdays').all()
);

const notifyWednesdays = async (client: Client, logger: Logger) => {
  logger.info("It's wednesday my dudes!");
  try {
    const message = await buildMessageContent();
    const ids = getAll();

    for (const { id, gid, type } of ids) {
      try {
        const guild = await client.guilds.fetch(gid);
        if (guild.available) {
          if (type === RecordType.Guild) {
            const channel = await guild.channels.fetch(id);
            if (channel instanceof TextChannel) {
              await channel.send(message);
              continue;
            }
          } else if (type === RecordType.User) {
            const users = await guild.members.fetch();
            const user = users.get(id);
            if (user && (user.presence?.status ?? 'dnd') !== 'dnd') {
              await user.send(message);
              continue;
            }
          }
        }

        logger.log(
          'info',
          `Removing { id: ${id}, gid: ${gid}, type: ${type}} as it was stale`
        );
      } catch (e) {
        logError(e, logger);
      }

      // Remove stale records
      logger.log(
        'info',
        `Removing { id: ${id}, gid: ${gid}, type: ${type}} as it was stale`
      );

      removeRecordEntry('wednesdays', id, gid, type);
    }
  } catch (e) {
    logError(e, logger);
  }
};

const wednesdayreminder: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('remindwednesdays')
    .setDescription('Toggle a reminder message for wednesdays'),
  init: async (client, logger) => {
    await initRecordTable('wednesdays', logger);
    const rule = new RecurrenceRule();
    rule.tz = 'Europe/Amsterdam';
    rule.dayOfWeek = 3; // 0-6 starting with sunday
    rule.hour = 12;
    rule.minute = 0;
    client.jobs.push(scheduleJob(rule, () => notifyWednesdays(client, logger)));
    logger.info('Setup wednesday notifier job');
  },
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (interaction.guild) {
        if (interaction.channel instanceof TextChannel) {
          const enabled = toggleGuildRecord('wednesdays', interaction.channel);
          return interaction.reply(
            enabled
              ? "I'll be sure to let everyone know!"
              : "Okay, I'll stop reminding everyone. :("
          );
        } else {
          return interaction.reply({
            content:
              'Command currently only works in text channels or direct messages :/',
            flags: 'Ephemeral'
          });
        }
      } else {
        await interaction.deferReply();
        const member = await fetchGuildMember(client, interaction.user);
        if (member) {
          const enabled = toggleUserRecord('wednesdays', member);
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
            "You have to share a guild with me to use that command and I couldn't find one. :/"
          );
        }
      }
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        flags: 'Ephemeral'
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
          const enabled = toggleGuildRecord('wednesdays', message.channel);
          return message.reply(
            enabled
              ? "I'll be sure to let everyone know!"
              : "Okay, I'll stop reminding everyone. :("
          );
        } else {
          return message.reply(
            'Command currently only works in text channels or direct messages :/'
          );
        }
      } else {
        // Apparantly this code never gets run because the bot won't respond to dms anymore (except for interactions)
        const member = await fetchGuildMember(client, message.author);
        if (member) {
          const enabled = toggleUserRecord('wednesdays', member);
          return message.reply(
            enabled
              ? "Okay, I'll be sure to let you know!"
              : "Alright, I won't let you know anymore."
          );
        } else {
          logger.log(
            'error',
            `Failed to find common channel with user: ${message.author.tag} (${message.author.id})`
          );
          return message.reply(
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
