import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder, Message } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.ts';
import { Logger } from 'winston';
import { errorToStr, getCommandArgs, logError, rootDir } from '../utils.ts';
import { request } from '@octokit/request';
import path from 'path';
import BotClient from '../client.ts';
import { access, readFile } from 'fs/promises';
import { PathLike } from 'fs';

const findVersionFile = async (): Promise<PathLike> => {
  try {
    const versionFilePath = path.join(rootDir, 'gitVersionHash.txt');
    await access(versionFilePath);
    return versionFilePath;
  } catch (_) {
    // If the file structure isn't as expected (e.g. we're running via tsx), attempt
    // to use the command line path instead:
    return path.join(process.cwd(), 'gitVersionHash.txt');
  }
};

const getCurrentCommitHash = async (logger: Logger): Promise<string | null> => {
  try {
    return (await readFile(await findVersionFile())).toString();
  } catch (e) {
    logger.log('warn', `Failed to fetch current commit hash: ${errorToStr(e)}`);
    return null;
  }
};

const getLastCommits = async (
  count: number,
  logger: Logger
): Promise<EmbedBuilder[]> => {
  const dunno = '¯\\_(ツ)_/¯';
  const { status, data } = await request('GET /repos/{owner}/{repo}/commits', {
    owner: 'andesyv',
    repo: 'ThonkBot',
    per_page: count
  });

  if (status !== 200) throw new Error("Couldn't fetch commits");

  const currentCommitHash = (await getCurrentCommitHash(logger))?.trimEnd();

  return data.map(({ sha, commit, html_url, author }) => {
    const [title, ...body] = commit.message.split('\n');
    const isCurrent =
      currentCommitHash !== undefined && sha.startsWith(currentCommitHash);
    const date = commit.author?.date;
    const embed = new EmbedBuilder({
      title: isCurrent ? `${title} 🚀` : title,
      url: html_url,
      footer: {
        text: commit.author?.name ?? dunno,
        iconURL: author?.avatar_url
      },
      timestamp: date !== undefined ? Date.parse(date) : undefined,
      description: 0 < body.length ? body.join('\n') : undefined
    });
    return embed;
  });
};

const patchnotes: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('patch')
    .setDescription('Get the last change(s) to the bot')
    .addNumberOption((opt) =>
      opt
        .setName('count')
        .setDescription('The amount of commits to return')
        .setMinValue(0)
        .setMaxValue(10)
        .setRequired(false)
    ),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    _client: BotClient,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const count = Math.floor(interaction.options.getNumber('count') ?? 1);
      const embeds = await getLastCommits(count, logger);

      await interaction.deferReply();

      return interaction.editReply({
        content: `Displaying last ${count} commits:`,
        embeds: embeds
      });
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        flags: 'Ephemeral'
      });
    }
  },
  aliases: ['patchnotes', 'notes', 'new'],
  handleMessage: async (
    message: Message,
    _client: BotClient,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const args = getCommandArgs(message);
      const count = 0 < args.length ? parseInt(args[0]) : 1;
      const embeds = await getLastCommits(count, logger);

      return message.reply({
        content: `Last ${count} commits:`,
        embeds: embeds
      });
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default patchnotes;
