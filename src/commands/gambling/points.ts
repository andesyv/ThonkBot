import { SlashCommandBuilder } from '@discordjs/builders';
import {
  Client,
  Message,
  GuildMember,
  ChatInputCommandInteraction
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../../command.ts';
import { Logger } from 'winston';
import { getUserPointsEntry } from '../../dbutils.ts';
import { getNickname, logError } from '../../utils.ts';

const points: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check how many points you currently have'),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (interaction.member instanceof GuildMember) {
        const name = getNickname(interaction.member, interaction.user);
        const entry = await getUserPointsEntry(interaction.member);
        return interaction.reply(
          `*${name}* has *${entry.points}* sthonks:tm:.`
        );
      } else {
        return interaction.reply('Command is only available in a server. :(');
      }
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        flags: 'Ephemeral'
      });
    }
  },
  aliases: ['point', 'sthonks'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (message.member) {
        const name = getNickname(message.member, message.author);
        const entry = await getUserPointsEntry(message.member);
        return message.reply(`*${name}* has *${entry.points}* sthonks:tm:.`);
      } else {
        return message.reply('Command is only available in a server. :(');
      }
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default points;
