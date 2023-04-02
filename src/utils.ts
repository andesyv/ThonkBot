import {
  AttachmentBuilder,
  Client,
  EmbedBuilder,
  GuildMember,
  Message,
  User
} from 'discord.js';
import { readdir } from 'fs/promises';
import * as path from 'path';
import { Logger } from 'winston';

export const getRandomAssetFileFromFolder = async (
  folder: string
): Promise<string> => {
  const rootPath = path.join(process.cwd(), folder);
  const files = await readdir(rootPath);

  if (Array.isArray(files) && 0 < files.length)
    return path.join(rootPath, files[Math.floor(Math.random() * files.length)]);

  throw new Error(`Could'nt find a random file in folder ${folder}`);
};

export interface SharedMessageOptions {
  embeds?: EmbedBuilder[];
  files?: AttachmentBuilder[];
}

export const randomImageToEmbed = async (
  folder: string,
  title?: string
): Promise<SharedMessageOptions> => {
  const file = await getRandomAssetFileFromFolder(folder);
  const attachment = new AttachmentBuilder(file);
  const embed = new EmbedBuilder({
    title: title ?? undefined,
    image: { url: `attachment://${path.basename(file)}` }
  });
  return {
    embeds: [embed],
    files: [attachment]
  };
};

export const getCommandArgs = (message: Message): string[] => {
  const args = message.content.substring(1).split(' ');
  args.shift();
  return args;
};

/** Shuffles array in place.
 * Modern version of Fisher-Yates (aka Knuth) Shuffle. ES6 version
 * @param {Array} a items An array containing the items.
 * @see https://bost.ocks.org/mike/shuffle/ and https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
 */
export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const getNickname = (
  member: GuildMember | unknown,
  user: User
): string =>
  (member instanceof GuildMember ? member.nickname : null) ??
  user.tag.split('#')[0];

export function splitToChunks<T>(components: T[], chunksize: number): T[][] {
  const result = [];
  for (let i = 0; i < components.length; i += chunksize)
    result.push(components.slice(i, i + chunksize));
  return result;
}

// Small helper to format errors to winston loggers
export const logError = (e: any, logger: Logger) =>
  logger.log('error', e instanceof Error ? e.message : JSON.stringify(e));

/**
 * Attempts to look through all the guilds of the bot in search for a common guild with the user
 * @note This operation is very slow
 * @returns A GuildMember instance if a common guild was found, undefined if not
 */
export const fetchGuildMember = async (
  client: Client,
  user: User
): Promise<GuildMember | undefined> => {
  const guilds = await client.guilds.fetch();

  for (const [_, resolvable] of guilds) {
    const guild = await resolvable.fetch();
    if (guild.available) {
      const members = await guild.members.fetch({ limit: 200 });
      const member = members.get(user.id);
      if (member) return member;
    }
  }
  return undefined;
};

export interface ScorePointRepresentation {
  name: string;
  value: number;
}

export const formatLeaderboardsString = (
  scores: { user: string; score: [...ScorePointRepresentation[]] }[]
): string => {
  if (scores.length <= 0 || scores.some((score) => score.score.length <= 0))
    return '';
  scores.sort((a, b) => b.score[0].value - a.score[0].value);
  const longestName = scores
    .map(({ user }) => user)
    .reduce((l, r) => (l.length < r.length ? r : l), '').length;

  const formatScore = (score: [...ScorePointRepresentation[]]): string =>
    score.map(({ name, value }) => `**${value}** ${name}`).join(', ');

  return scores
    .map(({ user, score }, i) => {
      return `${i + 1}. \t \`${user}\` ${' '.repeat(
        longestName - user.length
      )}\t (${formatScore(score)})`;
    })
    .join('\n');
};

export const formatLeaderboards = (
  scores: { user: string; score: [...ScorePointRepresentation[]] }[]
): EmbedBuilder => {
  const content = formatLeaderboardsString(scores);
  return new EmbedBuilder({
    title: 'Leaderboards',
    description:
      0 < content.length ? content : "There's nothing here. ¯\\_(ツ)_/¯"
  });
};
