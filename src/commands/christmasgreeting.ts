import { SlashCommandBuilder } from '@discordjs/builders';
import {
  Client,
  Message,
  GuildMember,
  ChatInputCommandInteraction
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.ts';
import { Logger } from 'winston';
import christmas from '../../data/christmas.json' with { type: 'json' };
import { getNickname, logError } from '../utils.ts';

const christmasgreeting: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('christmasgreeting')
    .setDescription('Send a "personal" christmas greeting to someone.')
    .addUserOption((opt) =>
      opt
        .setName('target')
        .setDescription('Person to send christmas greeting to')
        .setRequired(false)
    ),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const greeting =
        christmas.Christmas[
          Math.floor(Math.random() * christmas.Christmas.length)
        ];
      const target = interaction.options.getMember('target');
      if (target instanceof GuildMember && !target.user.bot) {
        const author = getNickname(interaction.member, interaction.user);
        void target.send(`${greeting} Best Regards ${author}!`);
        return interaction.reply({
          content: 'He/she/they liked it. (I think.)',
          flags: 'Ephemeral'
        });
      } else {
        interaction.reply(greeting);
      }
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        flags: 'Ephemeral'
      });
    }
  },
  aliases: ['christmas', 'jul'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const target = message.mentions.members?.first();
      const greeting =
        christmas.Christmas[
          Math.floor(Math.random() * christmas.Christmas.length)
        ];
      if (target && !target.user.bot) {
        const author = getNickname(message.member, message.author);
        target.send(`${greeting} Best Regards ${author}!`);
      } else {
        return message.reply(greeting);
      }
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default christmasgreeting;
