import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder, Message } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.js';
import { Logger } from 'winston';
import { errorToStr, getCommandArgs, logError } from '../utils.js';
import { request } from '@octokit/request';
import path from 'path';
import BotClient from '../client.js';
import { readFile } from 'fs/promises';

const getCurrentCommitHash = async (
  baseDir: string,
  logger: Logger
): Promise<string | null> => {
  try {
    return (
      await readFile(path.join(baseDir, 'gitVersionHash.txt'))
    ).toString();
  } catch (e) {
    logger.log('warn', `Failed to fetch current commit hash: ${errorToStr(e)}`);
    return null;
  }
};

const getLastCommits = async (
  count: number,
  baseDir: string,
  logger: Logger
): Promise<EmbedBuilder[]> => {
  const dunno = '¯\\_(ツ)_/¯';
  const { status, data } = await request('GET /repos/{owner}/{repo}/commits', {
    owner: 'andesyv',
    repo: 'ThonkBot',
    per_page: count
  });

  if (status !== 200) throw new Error("Couldn't fetch commits");

  const currentCommitHash = (
    await getCurrentCommitHash(baseDir, logger)
  )?.trimEnd();

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
    client: BotClient,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const count = Math.floor(interaction.options.getNumber('count') ?? 1);
      const embeds = await getLastCommits(count, client.baseDir, logger);

      await interaction.deferReply();

      return interaction.editReply({
        content: `Displaying last ${count} commits:`,
        embeds: embeds
      });
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['patchnotes', 'notes', 'new'],
  handleMessage: async (
    message: Message,
    client: BotClient,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const args = getCommandArgs(message);
      const count = 0 < args.length ? parseInt(args[0]) : 1;
      const embeds = await getLastCommits(count, client.baseDir, logger);

      return message.channel.send({
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
