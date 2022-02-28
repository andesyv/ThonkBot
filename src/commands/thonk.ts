import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  Client,
  Message,
  MessageAttachment
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import * as path from 'path';

const thonk: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('thonk')
    .setDescription('Sends a thonk emoji.'),
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const attachment = new MessageAttachment(
        path.join(process.cwd(), 'data/ThonkEmojis/thonk.png')
      );
      return interaction.reply({ files: [attachment] });
    } catch (e) {
      logger.log('error', e);
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
      const attachment = new MessageAttachment(
        path.join(process.cwd(), 'data/ThonkEmojis/thonk.png')
      );
      return message.channel.send({ files: [attachment] });
    } catch (e) {
      logger.log('error', e);
      return message.reply('Command failed. :(');
    }
  }
};

export default thonk;
