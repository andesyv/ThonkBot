import { SlashCommandBuilder } from '@discordjs/builders';
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  Client,
  Message
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.js';
import { Logger } from 'winston';
import * as path from 'path';
import { logError } from '../utils.js';

const thonk: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('thonk')
    .setDescription('Sends a thonk emoji.'),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const attachment = new AttachmentBuilder(
        path.join(process.cwd(), 'data/ThonkEmojis/thonk.png')
      );
      return interaction.reply({ files: [attachment] });
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['thinking'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const attachment = new AttachmentBuilder(
        path.join(process.cwd(), 'data/ThonkEmojis/thonk.png')
      );
      return message.channel.send({ files: [attachment] });
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default thonk;
