import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Client, Message } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { randomImageToEmbed } from '../util';

const pokemon: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('pokemon')
    .setDescription('Sends a random image of a pokemon.'),
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(await randomImageToEmbed('Pokemon', 'Pokémon'));
    } catch (e) {
      logger.log('error', e);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['randompokemon', 'pikachu', 'pikapika', 'ash'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return message.channel.send(
        await randomImageToEmbed('Pokemon', 'Pokémon')
      );
    } catch (e) {
      logger.log('error', e);
      return message.channel.send('Command failed. :(');
    }
  }
};

export default pokemon;
