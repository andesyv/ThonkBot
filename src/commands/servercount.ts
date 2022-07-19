import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, Message, ChatInputCommandInteraction } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { logError } from '../utils';

const servercount: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('servercount')
    .setDescription('Check how many servers ThonkBot is a part of'),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(
        `As far as I know, I currently reside in ${client.guilds.cache.size} servers.`
      );
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['servers', 'guildcount', 'guilds'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return message.channel.send(
        `As far as I know, I currently reside in ${client.guilds.cache.size} servers.`
      );
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default servercount;
