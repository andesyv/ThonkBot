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
