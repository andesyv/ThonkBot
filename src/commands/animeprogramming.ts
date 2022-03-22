import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Client, Message } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { getCommandArgs, randomImageToEmbed } from '../utils';
import { readdir, stat } from 'fs/promises';
import { join, basename } from 'path';

const getAllLanguageFolders = async (): Promise<string[]> => {
  const LANGUAGE_FOLDER_PATH = 'lib/anime-girls-holding-programming-books';
  const rootPath = join(process.cwd(), LANGUAGE_FOLDER_PATH);
  const folders = (await readdir(rootPath)).map(async (p) =>
    (await stat(join(rootPath, p))).isDirectory()
      ? join(LANGUAGE_FOLDER_PATH, p)
      : undefined
  );
  return (await Promise.all(folders)).filter(
    (p): p is string => p !== undefined
  );
};

const findLanguageFolder = async (
  language: string
): Promise<string | undefined> => {
  const folders = await getAllLanguageFolders();
  for (const subpath of folders)
    if (basename(subpath).toLowerCase() === language) return subpath;
  return undefined;
};

const findRandomLanguageFolder = async (): Promise<string> => {
  const folders = await getAllLanguageFolders();
  return folders[Math.floor(Math.random() * folders.length)];
};

const animeprogramming: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('animeprogramming')
    .setDescription(
      'Get some motivation to learn programming from some anime girls'
    )
    .addStringOption((opt) =>
      opt
        .setName('language')
        .setDescription('Specific programming language or topic')
        .setRequired(false)
    ),
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const language = interaction.options.getString('language')?.toLowerCase();
      const folder = await (language
        ? findLanguageFolder(language)
        : findRandomLanguageFolder());
      if (folder === undefined) {
        return interaction.reply("Anime girls don't program that language.");
      }

      return interaction.reply(
        await randomImageToEmbed(folder, 'Programming!')
      );
    } catch (e) {
      logger.log('error', e);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['programming', 'programminganime', 'animecoding', 'coding'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const args = getCommandArgs(message);
      const language = 0 < args.length ? args[0] : undefined;
      const folder = await (language
        ? findLanguageFolder(language)
        : findRandomLanguageFolder());
      if (folder === undefined) {
        return message.reply("Anime girls don't program that language.");
      }

      return message.reply(await randomImageToEmbed(folder, 'Programming!'));
    } catch (e) {
      logger.log('error', e);
      return message.reply('Command failed. :(');
    }
  }
};

export default animeprogramming;
