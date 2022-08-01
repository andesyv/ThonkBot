import { SlashCommandBuilder } from '@discordjs/builders';
import {
  Client,
  Message,
  GuildMember,
  ChatInputCommandInteraction
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.js';
import { Logger } from 'winston';
import compliments from '../../data/compliments.json' assert { type: 'json' };
import { logError } from '../utils.js';

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
        compliments.Compliments[
          Math.floor(Math.random() * compliments.Compliments.length)
        ];
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
        compliments.Compliments[
          Math.floor(Math.random() * compliments.Compliments.length)
        ];
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
