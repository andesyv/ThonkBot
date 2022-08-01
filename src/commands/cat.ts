import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, Client, Message } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.js';
import { Logger } from 'winston';
import { logError, randomImageToEmbed } from '../utils.js';

const cat: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Sends a random cat meme'),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(
        await randomImageToEmbed('data/Cats', 'Random cat')
      );
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Failed to send cat. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['cats', 'randomcat'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return message.channel.send(
        await randomImageToEmbed('data/Cats', 'Random cat')
      );
    } catch (e) {
      logError(e, logger);
      return message.channel.send('Failed to send cat. :(');
    }
  }
};

export default cat;
