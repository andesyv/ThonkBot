import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Client, Message, GuildMember } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { db } from '../dbutils';
import axios from 'axios';

interface DictEntry {
  word: string;
  length: number;
}

const DICTIONARY_URL =
  'https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json';

export const initWords = async (logger: Logger) => {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS words (
      word TEXT PRIMARY KEY,
      length INTEGER
    );`
  ).run();

  type QueryResp = { IsEmpty: number } | undefined;

  const tableIsEmpty =
    (
      db
        .prepare(
          'SELECT CASE WHEN EXISTS(SELECT * FROM words LIMIT 1) THEN 0 ELSE 1 END AS IsEmpty'
        )
        .get() as QueryResp
    )?.IsEmpty ?? true;
  if (tableIsEmpty) {
    logger.log('info', 'Rebuilding dictionary database');
    const { data } = await axios.get<Record<string, number>>(DICTIONARY_URL, {
      responseType: 'json'
    });

    const insert = db.prepare(
      'INSERT INTO words(word, length) VALUES (@word, @length);'
    );
    db.transaction((entries: DictEntry[]) => {
      for (const entry of entries) insert.run(entry);
    })(
      Object.entries(data).map(
        ([key]): DictEntry => ({ word: key, length: key.length })
      )
    );
    logger.log('info', 'Finished dictionary database');
  } else {
    logger.log('info', "Database wasn't empty");
  }
};

const wordle: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('wordle')
    .setDescription('Play a game of the famous letter word with your friends'),
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
    } catch (e) {
      logger.log('error', e);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
    } catch (e) {
      logger.log('error', e);
      return message.reply('Command failed. :(');
    }
  }
};

export default wordle;
