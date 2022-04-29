import { Client, ClientOptions } from 'discord.js';
import {
  ICommandBase,
  IMessageCommand,
  ISlashCommand,
  isMessageCommand,
  isSlashCommand
} from './command';
import { Job } from 'node-schedule';

type CommandType =
  | ICommandBase
  | (ICommandBase & IMessageCommand)
  | (ICommandBase & IMessageCommand & ISlashCommand);

export default class BotClient extends Client {
  private commands: CommandType[];
  public readonly interactionCommands: (ICommandBase &
    IMessageCommand &
    ISlashCommand)[];
  public readonly messageCommands: (ICommandBase & IMessageCommand)[];
  public jobs: Job[] = [];

  public constructor(options: ClientOptions, commands: CommandType[]) {
    super(options);
    this.commands = commands;
    this.interactionCommands = commands.filter((c) =>
      isSlashCommand(c)
    ) as (ICommandBase & IMessageCommand & ISlashCommand)[];
    this.messageCommands = commands.filter((c) =>
      isMessageCommand(c)
    ) as (ICommandBase & IMessageCommand)[];
  }
}
