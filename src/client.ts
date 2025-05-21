import { Client, ClientOptions, Message } from 'discord.js';
import {
  ICommandBase,
  IMessageCommand,
  ISlashCommand,
  isMessageCommand,
  isSlashCommand
} from './command.ts';
import { Job } from 'node-schedule';

type CommandType =
  | ICommandBase
  | (ICommandBase & IMessageCommand)
  | (ICommandBase & ISlashCommand);

export default class BotClient extends Client {
  public readonly interactionCommands: Map<
    string,
    ICommandBase & ISlashCommand
  >;
  public readonly messageCommands: Map<string, ICommandBase & IMessageCommand>;
  public jobs: Job[] = [];
  public messageEvents: ((msg: Message) => void)[] = [];

  public constructor(options: ClientOptions, commands: CommandType[]) {
    super(options);
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
