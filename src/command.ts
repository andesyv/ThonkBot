/**
 * Most code here gracefully stolen from https://github.com/lesesalen/lesebot
 */

import {
  ChatInputCommandInteraction,
  Message,
  SharedNameAndDescription,
  SharedSlashCommand
} from 'discord.js';
import { Logger } from 'winston';
import BotClient from './client.js';

export interface ICommandBase {
  data: SharedNameAndDescription & SharedSlashCommand;
  init?: (client: BotClient, logger: Logger) => Promise<void>;
}

export interface ISlashCommand {
  handleInteraction(
    interaction: ChatInputCommandInteraction,
    client: BotClient,
    logger: Logger
  ): Promise<unknown>;
}

export interface IMessageCommand {
  aliases?: string[];
  handleMessage(
    message: Message,
    client: BotClient,
    logger: Logger
  ): Promise<unknown>;
}

export const isCommand = (cmd: unknown): cmd is ICommandBase =>
  typeof cmd === 'object' && cmd !== null && 'data' in cmd;

export const isSlashCommand = (
  cmd: ICommandBase
): cmd is ICommandBase & ISlashCommand => 'handleInteraction' in cmd;

export const isMessageCommand = (
  cmd: ICommandBase
): cmd is ICommandBase & IMessageCommand => 'handleMessage' in cmd;
