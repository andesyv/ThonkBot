import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Client, Message } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { LOTR as quotes } from '../../data/quotes.json';

const lotr: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('lotr')
    .setDescription('Random LOTR quote'),
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(
        quotes[Math.floor(Math.random() * quotes.length)]
      );
    } catch (e) {
      logger.log('error', e);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['hobbit', 'gandalf', 'lordoftherings'],
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
      logger.log('error', e);
      return message.channel.send('Command failed. :(');
    }
  }
};

export default lotr;
