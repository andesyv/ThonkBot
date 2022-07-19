import { SlashCommandBuilder } from '@discordjs/builders';
import {
  Client,
  Message,
  GuildMember,
  ChatInputCommandInteraction
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { Compliments } from '../../data/compliments.json';
import { logError } from '../utils';

const compliment: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('Send a "personal" compliment to someone.')
    .addUserOption((opt) =>
      opt
        .setName('target')
        .setDescription('Person to compliment')
        .setRequired(false)
    ),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const compliment =
        Compliments[Math.floor(Math.random() * Compliments.length)];
      const target = interaction.options.getMember('target');
      if (target instanceof GuildMember && !target.user.bot) {
        void target.send(compliment);
        return interaction.reply({
          content: 'He/she/they liked it. (I think.)',
          ephemeral: true
        });
      } else {
        return interaction.reply(compliment);
      }
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['compliments', 'comp', 'kompliment'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const target = message.mentions.members?.first();
      const compliment =
        Compliments[Math.floor(Math.random() * Compliments.length)];
      if (target && !target.user.bot) {
        target.send(compliment);
      } else {
        return message.channel.send(compliment);
      }
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default compliment;
