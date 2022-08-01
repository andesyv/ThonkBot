import { SlashCommandBuilder } from '@discordjs/builders';
import { Message } from 'discord.js';
import { ICommandBase, IMessageCommand } from '../command.js';
import { Logger } from 'winston';
import BotClient from '../client.js';
import { logError } from '../utils.js';

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
      const commands = [...client.messageCommands.keys()]
        .map((s) => `\`${s}\``)
        .join(', ');
      return message.channel.send(
        `All available commands and their aliases:\n${commands}`
      );
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default commands;
