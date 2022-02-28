import { SlashCommandBuilder } from '@discordjs/builders';
import { Message } from 'discord.js';
import { ICommandBase, IMessageCommand } from '../command';
import { Logger } from 'winston';
import BotClient from '../client';

const commands: ICommandBase & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('commands')
    .setDescription('Fetch all commands and their aliases'),
  aliases: ['cmd', 'cmds'],
  handleMessage: async (
    message: Message,
    client: BotClient,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const commands = [
        ...client.messageCommands.map(({ data, aliases }) => [
          data.name,
          ...(aliases ?? [])
        ])
      ]
        .flat()
        .map((s) => `\`${s}\``)
        .join(', ');
      return message.channel.send(
        `All available commands and their aliases:\n${commands}`
      );
    } catch (e) {
      logger.log('error', e);
      return message.reply('Command failed. :(');
    }
  }
};

export default commands;
