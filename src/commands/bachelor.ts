import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Client, Message } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { Interval, intervalToDuration, formatDistance } from 'date-fns';

const percentageTowardsDate = (from: Date, to: Date): number => {
  const now = Date.now();
  const passed: Interval = { start: from, end: now };
  const total: Interval = { start: from, end: to };
  const percentage =
    (intervalToDuration(passed).seconds ?? 0) /
    (intervalToDuration(total).seconds ?? 1);
  return percentage * 100;
};

const timeLeft = (before = false) => {
  return before
    ? formatDistance(Date.now(), new Date('May 20, 2020 12:00:00'))
    : formatDistance(new Date('May 20, 2020 12:00:00'), Date.now());
};

const formatDatePercentage = () => {
  const p = percentageTowardsDate(
    new Date('Jan 6, 2020 9:00:00'),
    new Date('May 20, 2020 12:00:00')
  );
  const before = p <= 100;

  return (
    `Time ${before ? 'left until' : 'since'} bachelor deadline: ${timeLeft(
      before
    )}\n` + (before ? `Percentage: ${p.toFixed(2)}%` : "You're done! :o")
  );
};

const bachelor: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('bachelor')
    .setDescription('Shows the time remaining on my bachelor project'),
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(formatDatePercentage());
    } catch (e) {
      logger.log('error', e);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['bachelorleft', 'bachelortimeleft', 'pilot', 'pilotleft'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return message.channel.send(formatDatePercentage());
    } catch (e) {
      logger.log('error', e);
      return message.reply('Command failed. :(');
    }
  }
};

export default bachelor;
