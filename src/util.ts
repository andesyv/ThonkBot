import {
  Message,
  MessageAttachment,
  MessageEmbed,
  MessageOptions
} from 'discord.js';
import { readdir } from 'fs/promises';
import * as path from 'path';

export const getRandomAssetFileFromFolder = async (
  folder: string
): Promise<string> => {
  const rootPath = path.join(process.cwd(), `data/${folder}`);
  const files = await readdir(rootPath);

  if (Array.isArray(files) && 0 < files.length)
    return path.join(rootPath, files[Math.floor(Math.random() * files.length)]);

  throw new Error(`Could'nt find a random file in folder ${folder}`);
};

export const randomImageToEmbed = async (
  folder: string,
  title?: string
): Promise<MessageOptions> => {
  const file = await getRandomAssetFileFromFolder(folder);
  const attachment = new MessageAttachment(file);
  let embed = new MessageEmbed().setImage(
    `attachment://${path.basename(file)}`
  );
  if (title !== undefined) embed = embed.setTitle(title);
  return {
    embeds: [embed],
    files: [attachment]
  };
};

export const getCommandArgs = (message: Message) => {
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
