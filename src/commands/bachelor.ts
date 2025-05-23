import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, Client, Message } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.ts';
import { Logger } from 'winston';
import { Interval, intervalToDuration, formatDistance } from 'date-fns';
import { logError } from '../utils.ts';

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
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(formatDatePercentage());
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        flags: 'Ephemeral'
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
      return message.reply(formatDatePercentage());
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default bachelor;
