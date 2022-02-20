import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  Client,
  MessageEmbed,
  MessageAttachment,
  MessageOptions,
  Message} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { readdir } from 'fs/promises';
import * as path from 'path';
import { Logger } from 'winston';

const getRandomFileFromFolder = async (folder: string): Promise<string> => {
  const rootPath = path.join(process.cwd(), `data/${folder}`);
  const files = await readdir(rootPath);
  if (Array.isArray(files) && 0 < files.length)
    return path.join(rootPath, files[Math.floor(Math.random() * files.length)]);
  throw new Error(`Could'nt find a random file in folder ${folder}`);
};

const findCat = async (): Promise<MessageOptions> => {
  const file = await getRandomFileFromFolder('Cats');
  const attachment = new MessageAttachment(file);
  const embed = new MessageEmbed()
    .setTitle('Random cat')
    .setImage(`attachment://${path.basename(file)}`);
  return {
    embeds: [embed],
    files: [attachment]
  };
};

const cat: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Sends a random cat meme'),
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return interaction.reply(await findCat());
    } catch (e) {
      return interaction.reply({
        content: 'Failed to send cat. :(',
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
      return message.channel.send(await findCat());
    } catch (e) {
      return message.channel.send('Failed to send cat. :(');
    }
  }
};

export default cat;
