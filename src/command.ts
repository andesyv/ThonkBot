/**
 * Most code here gracefully stolen from https://github.com/lesesalen/lesebot
 */

import {
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from '@discordjs/builders';
import { Client, CommandInteraction, Message } from 'discord.js';
import { Logger } from 'winston';

export interface ICommandBase {
  data:
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
    | SlashCommandSubcommandsOnlyBuilder;
}

export interface ISlashCommand {
  handleInteraction(
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown>;
}

export interface IMessageCommand {
  aliases?: string[];
  handleMessage(
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown>;
}

// https://stackoverflow.com/questions/49707327/typescript-check-if-property-in-object-in-typesafe-way
function hasOwnProperty<T, K extends PropertyKey>(
  obj: T,
  prop: K
): obj is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export const isSlashCommand = (
  cmd: ICommandBase
): cmd is ICommandBase & ISlashCommand =>
  hasOwnProperty(cmd, 'handleInteraction');

export const isMessageCommand = (
  cmd: ICommandBase
): cmd is ICommandBase & IMessageCommand =>
  hasOwnProperty(cmd, 'handleMessage');
