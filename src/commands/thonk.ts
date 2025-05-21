import { SlashCommandBuilder } from '@discordjs/builders';
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  Client,
  Message
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.ts';
import { Logger } from 'winston';
import * as path from 'path';
import { getDataFolderPath, logError } from '../utils.ts';

const thonk: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('thonk')
    .setDescription('Sends a thonk emoji.'),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    _client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const attachment = new AttachmentBuilder(
        path.join(await getDataFolderPath(), 'ThonkEmojis/thonk.png')
      );
      return interaction.reply({ files: [attachment] });
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        flags: 'Ephemeral'
      });
    }
  },
  aliases: ['thinking'],
  handleMessage: async (
    message: Message,
    _client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const attachment = new AttachmentBuilder(
        path.join(await getDataFolderPath(), 'ThonkEmojis/thonk.png')
      );
      return message.reply({ files: [attachment] });
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default thonk;
