import { Client, ClientOptions, Message } from 'discord.js';
import {
  ICommandBase,
  IMessageCommand,
  ISlashCommand,
  isMessageCommand,
  isSlashCommand
} from './command.js';
import { Job } from 'node-schedule';
import path from 'path';
import { fileURLToPath } from 'url';

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
  public messageEvents: ((msg: Message) => void)[] = [];
  public readonly baseDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
  );

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
