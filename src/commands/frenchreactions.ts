import { SlashCommandBuilder } from '@discordjs/builders';
import {
  Client,
  Message,
  TextChannel,
  ChatInputCommandInteraction
} from 'discord.js';
import { ICommandBase, IMessageCommand, ISlashCommand } from '../command.ts';
import { Logger } from 'winston';
import {
  db,
  initRecordTable,
  toggleGuildRecord,
  toggleUserRecord
} from '../dbutils.ts';
import { fetchGuildMember, logError } from '../utils.ts';
import { franc } from 'franc';

const enabledMessage = (enabled: boolean) =>
  enabled
    ? 'French <:FeelsBaguetteMan:1003683996565254234>'
    : 'No more french <:FeelsBadMan:1003684973330571294>';

const reactToMessage = (msg: Message) => {
  if (franc(msg.content) === 'fra') {
    if (msg.guildId) {
      if (
        db
          .prepare('SELECT * FROM frenchreactions WHERE gid = @id')
          .get({ id: msg.guildId }) !== undefined
      )
        msg.react('<:FeelsBaguetteMan:1003683996565254234>');
    } else {
      if (
        db
          .prepare('SELECT * FROM frenchreactions WHERE id = @id AND type = 1')
          .get({ id: msg.author.id }) !== undefined
      )
        msg.react('<:FeelsBaguetteMan:1003683996565254234>');
    }
  }
};

const frenchreactions: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('frenchreactions')
    .setDescription(
      'Toggle ThonkBot to react with an emoji everytime they think the text is french'
    ),
  init: async (client, logger) => {
    await initRecordTable('frenchreactions', logger);
    client.messageEvents.push(reactToMessage);
  },
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (interaction.guild) {
        if (interaction.channel instanceof TextChannel) {
          const enabled = toggleGuildRecord(
            'frenchreactions',
            interaction.channel
          );
          return interaction.reply(enabledMessage(enabled));
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
          const enabled = toggleUserRecord('frenchreactions', member);
          return interaction.editReply(enabledMessage(enabled));
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
        flags: 'Ephemeral'
      });
    }
  },
  aliases: ['french', 'baguette', 'ouioui'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (message.guild) {
        if (message.channel instanceof TextChannel) {
          const enabled = toggleGuildRecord('frenchreactions', message.channel);
          return message.reply(enabledMessage(enabled));
        } else {
          return message.reply(
            'Command currently only works in text channels or direct messages :/'
          );
        }
      } else {
        // Apparantly this code never gets run because the bot won't respond to dms anymore (except for interactions)
        const member = await fetchGuildMember(client, message.author);
        if (member) {
          const enabled = toggleUserRecord('frenchreactions', member);
          return message.reply(enabledMessage(enabled));
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

export default frenchreactions;
