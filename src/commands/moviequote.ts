import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, Client, Message } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.ts';
import { Logger } from 'winston';
import quotes from '../../data/quotes.json' with { type: 'json' };
import { logError } from '../utils.ts';

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
        quotes.MovieQuotes[
          Math.floor(Math.random() * quotes.MovieQuotes.length)
        ]
      );
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        flags: 'Ephemeral'
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
      return message.reply(
        quotes.MovieQuotes[
          Math.floor(Math.random() * quotes.MovieQuotes.length)
        ]
      );
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default moviequote;
