import { Message } from 'discord.js';
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

export const getCommandArgs = (message: Message) => {
  const args = message.content.substring(1).split(' ');
  args.shift();
  return args;
};
