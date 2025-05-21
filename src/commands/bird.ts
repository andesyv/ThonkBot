import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, Client, Message } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.ts';
import { Logger } from 'winston';
import { logError, randomImageToEmbed } from '../utils.ts';

const bird: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('bird')
    .setDescription('Sends a random image of a bird.'),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(await randomImageToEmbed('Bird', 'Bird'));
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        flags: 'Ephemeral'
      });
    }
  },
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return message.reply(await randomImageToEmbed('Bird', 'Bird'));
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default bird;
