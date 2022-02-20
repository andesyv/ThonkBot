import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  Client,
  MessageEmbed,
  MessageAttachment,
  MessageOptions,
  Message
} from 'discord.js';
import { FullCommand } from '../command';
import { readdirSync } from 'fs';
import * as path from 'path';
import { Logger } from 'winston';

export class Cat extends FullCommand {
  builder = new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Sends a random cat meme');

  public async handleInteraction(
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> {
    try {
      return interaction.reply(await this.findCat());
    } catch (e) {
      return interaction.reply({
        content: 'Failed to send cat. :(',
        ephemeral: true
      });
    }
  }

  public async handleMessage(
    message: Message<boolean>,
    client: Client<boolean>,
    logger: Logger
  ): Promise<unknown> {
    try {
      return message.channel.send(await this.findCat());
    } catch (e) {
      return message.channel.send('Failed to send cat. :(');
    }
  }

  findCat = async (): Promise<MessageOptions> => {
    const files = readdirSync('./data/Cats');
    if (files.constructor === Array) {
      const randomFile = files[Math.floor(Math.random() * files.length)];
      if (typeof randomFile == 'string') {
        const embed = new MessageEmbed()
          .setImage(`attachment://${randomFile}`)
          .setTitle('Random cat');
        return {
          embeds: [embed],
          attachments: [
            new MessageAttachment(
              path.resolve(process.cwd(), path.join('./data/Cats', randomFile))
            )
          ]
        };
      }
    }
    throw new Error('Cannot find random file in ' + './data/Cats');
  };
}
