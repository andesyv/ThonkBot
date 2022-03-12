import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Client, Message, GuildMember } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../../command';
import { Logger } from 'winston';
import { getUserPointsEntry } from '../../dbutils';
import { getNickname } from '../../utils';

const points: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check how many points you currently have'),
  handleInteraction: async (
    interaction: CommandInteraction,
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
      logger.log('error', e);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
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
        return message.channel.send(
          `*${name}* has *${entry.points}* sthonks:tm:.`
        );
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

export default points;
