import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Client, Message } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { randomImageToEmbed } from '../util';

const cat: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Sends a random cat meme'),
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(await randomImageToEmbed('Cats', 'Random cat'));
    } catch (e) {
      logger.log('error', e);
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
        await randomImageToEmbed('Cats', 'Random cat')
      );
    } catch (e) {
      logger.log('error', e);
      return message.channel.send('Failed to send cat. :(');
    }
  }
};

export default cat;
