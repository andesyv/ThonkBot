import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, Client, Message } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { MovieQuotes as quotes } from '../../data/quotes.json';
import { logError } from '../utils';

const moviequote: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('movie')
    .setDescription('Random quote from a movie'),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(
        quotes[Math.floor(Math.random() * quotes.length)]
      );
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['quote', 'moviequote'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return message.channel.send(
        quotes[Math.floor(Math.random() * quotes.length)]
      );
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default moviequote;
