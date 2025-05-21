import { SlashCommandBuilder } from '@discordjs/builders';
import {
  Client,
  Message,
  GuildMember,
  ChatInputCommandInteraction
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../../command.ts';
import { Logger } from 'winston';
import { getLeaderboards } from '../../dbutils.ts';
import { logError } from '../../utils.ts';

const leaderboard: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('pointsleaderboard')
    .setDescription("Check this guild's current rankings"),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (interaction.member instanceof GuildMember) {
        const embed = await getLeaderboards(interaction.member.guild);

        return embed
          ? interaction.reply({ embeds: [embed] })
          : interaction.reply("There's no leaderboards yet. :(");
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
  aliases: ['leaderboard', 'leaderboards'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (message.member) {
        const embed = await getLeaderboards(message.member.guild);
        return embed
          ? message.reply({ embeds: [embed] })
          : message.reply("There's no leaderboards yet. :(");
      } else {
        return message.reply('Command is only available in a server. :(');
      }
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default leaderboard;
