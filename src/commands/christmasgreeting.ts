import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Client, Message, GuildMember } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { Christmas } from '../../data/christmas.json';
import { getNickname } from '../utils';

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
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const greeting = Christmas[Math.floor(Math.random() * Christmas.length)];
      const target = interaction.options.getMember('target');
      if (target instanceof GuildMember && !target.user.bot) {
        const author = getNickname(interaction.member, interaction.user);
        void target.send(`${greeting} Best Regards ${author}!`);
        return interaction.reply({
          content: 'He/she/they liked it. (I think.)',
          ephemeral: true
        });
      } else {
        interaction.reply(greeting);
      }
    } catch (e) {
      logger.log('error', e);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
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
      const greeting = Christmas[Math.floor(Math.random() * Christmas.length)];
      if (target && !target.user.bot) {
        const author = getNickname(message.member, message.author);
        target.send(`${greeting} Best Regards ${author}!`);
      } else {
        return message.channel.send(greeting);
      }
    } catch (e) {
      logger.log('error', e);
      return message.reply('Command failed. :(');
    }
  }
};

export default christmasgreeting;
