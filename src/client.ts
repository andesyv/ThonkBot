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
  | (ICommandBase & ISlashCommand);

export default class BotClient extends Client {
  private commands: CommandType[];
  public readonly interactionCommands: Map<
    string,
    ICommandBase & ISlashCommand
  >;
  public readonly messageCommands: Map<string, ICommandBase & IMessageCommand>;
  public jobs: Job[] = [];

  public constructor(options: ClientOptions, commands: CommandType[]) {
    super(options);
    this.commands = commands;
    this.interactionCommands = new Map(
      commands.filter(isSlashCommand).map((cmd) => [cmd.data.name, cmd])
    );
    this.messageCommands = new Map(
      commands
        .filter(isMessageCommand)
        .map((cmd) => {
          const rets: [string, typeof cmd][] = [];
          for (const alias of cmd.aliases ?? [])
            rets.push([alias.toLowerCase(), cmd]);

          rets.push([cmd.data.name.toLowerCase(), cmd]);
          return rets;
        })
        .flat()
    );
  }
}
