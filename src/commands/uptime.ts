import { SlashCommandBuilder, time } from '@discordjs/builders';
import { Client, Message, ChatInputCommandInteraction } from 'discord.js';
import { ICommandBase, IMessageCommand, ISlashCommand } from '../command.ts';
import { Logger } from 'winston';
import { db, wrapDBThrowable } from '../dbutils.ts';
import { logError, millisecondsToDuration } from '../utils.ts';
import { RecurrenceRule, scheduleJob } from 'node-schedule';
import { parseISO, differenceInMilliseconds, formatDuration } from 'date-fns';

interface UptimeRecordDBEntry {
  start: string;
  end: string;
}

interface UptimeRecord {
  start: Date;
  end: Date;
}

const initTable = (logger: Logger) => {
  try {
    wrapDBThrowable(() => {
      db.prepare(
        `CREATE TABLE IF NOT EXISTS uptimeRecords (
          id INTEGER PRIMARY KEY,
          start TEXT NOT NULL,
          end TEXT NOT NULL
        );`
      ).run();
    })();
  } catch (e) {
    logError(e, logger);
  }
};

const getAllDBEntries = wrapDBThrowable((): UptimeRecordDBEntry[] =>
  db
    .prepare<unknown[], UptimeRecordDBEntry>('SELECT * FROM uptimeRecords')
    .all()
);

const getAll = (): UptimeRecord[] =>
  getAllDBEntries().map((entry) => ({
    start: parseISO(entry.start),
    end: parseISO(entry.end)
  }));

const updateLastRecordToCurrentTime = wrapDBThrowable(() => {
  db.prepare(
    "UPDATE uptimeRecords SET end=datetime('now') WHERE id = (SELECT id FROM uptimeRecords ORDER BY id DESC LIMIT 1);"
  ).run();
});

const updateCurrentTime = (logger: Logger) => {
  try {
    updateLastRecordToCurrentTime();
  } catch (e) {
    logError(e, logger);
  }
};

const buildMessageContent = (): string => {
  const records = getAll();
  const first = records.at(0)?.start;
  const last = records.at(-1)?.end;
  const totalTimeMS =
    1 < records.length && first !== undefined && last !== undefined
      ? differenceInMilliseconds(last, first)
      : 0;
  const aliveTimeMS = records.reduce(
    (acc, curr) => acc + differenceInMilliseconds(curr.end, curr.start),
    0
  );
  const humanReadableDuration = formatDuration(
    millisecondsToDuration(aliveTimeMS)
  );
  const percentage = Math.round((10000 * aliveTimeMS) / totalTimeMS) * 0.01;
  return `ThonkBot™ has been alive for a total of ${Math.floor(
    aliveTimeMS
  )} milliseconds (${humanReadableDuration}) or ${percentage} % since ${
    first !== undefined ? time(first, 'F') : '¯\\_(ツ)_/¯'
  }`;
};

const uptime: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Check how long the bot has been alive for'),
  init: async (client, logger) => {
    initTable(logger);

    db.prepare(
      "INSERT INTO uptimeRecords (start, end) VALUES (datetime('now'), datetime('now'));"
    ).run();

    const rule = new RecurrenceRule();
    rule.minute = Array.from({ length: 6 }, (_, i) => i * 10);
    client.jobs.push(scheduleJob(rule, () => updateCurrentTime(logger)));
    logger.info('Setup uptime logging job');
  },
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    _client: Client,
    logger: Logger
  ): Promise<unknown> => {
    await interaction.deferReply();
    try {
      // Update current time before sending message
      updateCurrentTime(logger);
      return interaction.editReply(buildMessageContent());
    } catch (e) {
      logError(e, logger);
      return interaction.editReply('Command failed. :(');
    }
  },
  aliases: ['alive', 'notdead', 'survived'],
  handleMessage: async (
    message: Message,
    _client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      // Update current time before sending message
      updateCurrentTime(logger);
      return message.reply(buildMessageContent());
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default uptime;
