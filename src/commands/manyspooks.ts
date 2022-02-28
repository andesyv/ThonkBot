import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  Client,
  Message,
  MessageOptions,
  MessageAttachment
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { shuffle } from '../utils';
import * as path from 'path';
import { readdir, stat } from 'fs/promises';

const fetchManySpooks = async (): Promise<MessageOptions> => {
  const dirpath = path.join(process.cwd(), 'data', 'Spooks');
  const files = shuffle(await readdir(dirpath));
  const discordFileSizeLimit = 8 * 1024 * 1024;

  let messageSize = 0;
  const spooks: MessageAttachment[] = [];
  for (const file of files) {
    const filePath = path.join(dirpath, file);
    const { size } = await stat(filePath);

    if (spooks.length < 10 && messageSize + size < discordFileSizeLimit) {
      spooks.push(new MessageAttachment(filePath));
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
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(await fetchManySpooks());
    } catch (e) {
      logger.log('error', e);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
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
      return message.channel.send(await fetchManySpooks());
    } catch (e) {
      logger.log('error', e);
      return message.reply('Command failed. :(');
    }
  }
};

export default manyspooks;
