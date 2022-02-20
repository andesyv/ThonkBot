/**
 * Most code here gracefully stolen from https://github.com/lesesalen/lesebot
 */

import { SlashCommandBuilder } from '@discordjs/builders';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9';
import { Client, CommandInteraction, Message } from 'discord.js';
import { Logger } from 'winston';

export interface ICommandBase {
  builder: SlashCommandBuilder;
  getName(): string;
  toJSON(): RESTPostAPIApplicationCommandsJSONBody;
}

export interface ISlashCommand {
  handleInteraction(
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown>;
}

export interface IMessageCommand {
  handleMessage(
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown>;
}

export type CommandApiConstructor = { default: { new (): ICommandBase } };

export abstract class BaseCommand implements ICommandBase {
  public abstract builder: SlashCommandBuilder;

  getName(): string {
    return this.builder.name.toLowerCase();
  }

  public toJSON(): RESTPostAPIApplicationCommandsJSONBody {
    return this.builder.toJSON();
  }
}

export abstract class MessageCommand
  extends BaseCommand
  implements IMessageCommand
{
  public abstract handleMessage(
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown>;
}

export abstract class FullCommand
  extends BaseCommand
  implements ISlashCommand, IMessageCommand
{
  public abstract handleInteraction(
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown>;
  public abstract handleMessage(
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown>;
}
