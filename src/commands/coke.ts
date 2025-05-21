import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Message, ChatInputCommandInteraction } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.ts';
import { Logger } from 'winston';
import { logError, randomImageToEmbed } from '../utils.ts';

const coke: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('coke')
    .setDescription('Sends a random image of *Coke*.'),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(await randomImageToEmbed('Coke'));
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        flags: 'Ephemeral'
      });
    }
  },
  aliases: ['cola', 'cocacola', 'pepsi'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return message.reply(await randomImageToEmbed('Coke'));
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default coke;
