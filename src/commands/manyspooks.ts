import { SlashCommandBuilder } from '@discordjs/builders';
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  Client,
  Message
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.ts';
import { Logger } from 'winston';
import {
  getDataFolderPath,
  logError,
  SharedMessageOptions,
  shuffle
} from '../utils.ts';
import * as path from 'path';
import { readdir, stat } from 'fs/promises';

const fetchManySpooks = async (): Promise<SharedMessageOptions> => {
  const dirpath = path.join(await getDataFolderPath(), 'Spooks');
  const files = shuffle(await readdir(dirpath));
  const discordFileSizeLimit = 8 * 1024 * 1024;

  let messageSize = 0;
  const spooks: AttachmentBuilder[] = [];
  for (const file of files) {
    const filePath = path.join(dirpath, file);
    const { size } = await stat(filePath);

    if (spooks.length < 10 && messageSize + size < discordFileSizeLimit) {
      spooks.push(new AttachmentBuilder(filePath));
      messageSize += size;
    }
  }

  return { files: spooks };
};

const manyspooks: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('manyspooks')
    .setDescription('Sends a lot of spooky images.'),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(await fetchManySpooks());
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        flags: 'Ephemeral'
      });
    }
  },
  aliases: ['allspooks', 'alotofspooks', 'tonofspooks'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return message.reply(await fetchManySpooks());
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default manyspooks;
