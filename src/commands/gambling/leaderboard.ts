import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Client, Message, GuildMember } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../../command';
import { Logger } from 'winston';
import { getLeaderboards } from '../../dbutils';

const leaderboard: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('pointsleaderboard')
    .setDescription("Check this guild's current rankings"),
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (interaction.member instanceof GuildMember) {
        const embed = getLeaderboards(interaction.member.guild);

        return embed
          ? interaction.reply({ embeds: [embed] })
          : interaction.reply("There's no leaderboards yet. :(");
      } else {
        return interaction.reply('Command is only available in a server. :(');
      }
    } catch (e) {
      logger.log('error', e);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
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
        const embed = getLeaderboards(message.member.guild);
        return embed
          ? message.channel.send({ embeds: [embed] })
          : message.channel.send("There's no leaderboards yet. :(");
      } else {
        return message.channel.send(
          'Command is only available in a server. :('
        );
      }
    } catch (e) {
      logger.log('error', e);
      return message.reply('Command failed. :(');
    }
  }
};

export default leaderboard;
