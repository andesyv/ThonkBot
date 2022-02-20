import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  Client,
  MessageEmbed,
  MessageAttachment,
  MessageOptions,
  Message
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { getRandomAssetFileFromFolder } from '../util';
import * as path from 'path';

const findCat = async (): Promise<MessageOptions> => {
  const file = await getRandomAssetFileFromFolder('Cats');
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
      logger.log('error', e);
      return interaction.reply({
        content: 'Failed to send cat. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['cats', 'randomcat'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      return message.channel.send(await findCat());
    } catch (e) {
      logger.log('error', e);
      return message.channel.send('Failed to send cat. :(');
    }
  }
};

export default cat;
