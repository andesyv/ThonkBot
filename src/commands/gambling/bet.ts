import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Client, Message, GuildMember } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../../command';
import { Logger } from 'winston';
import { getUserPointsEntry, updatePoints } from '../../dbutils';
import { getCommandArgs } from '../../utils';

const gamble = (points: number, amount: number): [number, number] => {
  const r = Math.round(Math.random() * 100);
  const factor = (r / 100) * 2 - 1; // Convert from [0, 100] to [-1, 1]
  return [Math.max(points + Math.round(Math.pow(amount, 2) * factor), 0), r];
};

const formatReply = (
  name: string,
  amount: number,
  roll: number,
  points: number
) =>
  `${name} bet **${amount}** sthonks, rolled a **${roll}**, and now has **${points}** sthonks.`;

const parseNumber = (s: string): number | undefined => {
  const n = Number.parseInt(s);
  return Number.isNaN(s) ? undefined : n;
};

const bet: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('bet')
    .setDescription('Gamble all your hard earned points away')
    .addNumberOption((opt) =>
      opt
        .setName('amount')
        .setDescription('The amount you would like to bet.')
        .setMinValue(0)
        .setRequired(true)
    ),
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (interaction.member instanceof GuildMember) {
        const { points } = await getUserPointsEntry(interaction.member);
        if (points <= 0) {
          return interaction.reply("You're broke!");
        } else {
          const amount = Math.min(
            interaction.options.getNumber('amount', true),
            points
          );

          const [newPoints, roll] = gamble(points, amount);
          updatePoints(interaction.member, newPoints);
          return interaction.reply(
            formatReply(
              interaction.member.nickname ?? interaction.member.user.tag,
              amount,
              roll,
              newPoints
            )
          );
        }
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
  aliases: ['gamble'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (message.member) {
        const { points } = await getUserPointsEntry(message.member);
        if (points <= 0) {
          return message.reply("You're broke!");
        } else {
          const args = getCommandArgs(message);
          let amount =
            0 < args.length
              ? args[0].toUpperCase() === 'ALL'
                ? points
                : parseNumber(args[0])
              : undefined;
          if (amount) {
            amount = Math.min(amount, points);
            const [newPoints, roll] = gamble(points, amount);
            updatePoints(message.member, newPoints);
            return message.reply(
              formatReply(
                message.member.nickname ?? message.member.user.tag,
                amount,
                roll,
                newPoints
              )
            );
          } else {
            return message.reply(
              'You need to specify a valid amount (or "all") to gamble.'
            );
          }
        }
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

export default bet;
