import {
  BaseInteraction,
  ChatInputCommandInteraction,
  GatewayIntentBits,
  InteractionType
} from 'discord.js';
import winston from 'winston';
import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { readdir, stat } from 'fs/promises';
import * as path from 'path';
import {
  ICommandBase,
  IMessageCommand,
  ISlashCommand,
  isCommand
} from './command.ts';
import { initDB } from './dbutils.ts';
import BotClient from './client.ts';
import { logError } from './utils.ts';
import { fileURLToPath, pathToFileURL } from 'url';
import minimist from 'minimist';

type CommandType =
  | ICommandBase
  | (ICommandBase & IMessageCommand)
  | (ICommandBase & IMessageCommand & ISlashCommand);

const isApplicationInteraction = (
  interaction: BaseInteraction
): interaction is ChatInputCommandInteraction =>
  interaction.type === InteractionType.ApplicationCommand;

const fetchCommandPaths = async (root: string): Promise<string[]> => {
  return (
    await Promise.all(
      (await readdir(root)).map(async (name) => {
        const filePath = path.join(root, name);
        return (await stat(filePath)).isDirectory()
          ? await fetchCommandPaths(filePath)
          : filePath;
      })
    )
  ).flat();
};

const loadCommands = async (logger: winston.Logger): Promise<CommandType[]> => {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const excludeSet = new Set(process.env.EXCLUDE_COMMANDS?.split(';'));
  if (excludeSet.size > 0)
    logger.verbose(
      `Excluding commands: ${Array.from(excludeSet.keys()).join(', ')}`
    );
  else logger.verbose('No commands are excluded');
  const commandPaths = (
    await fetchCommandPaths(path.normalize(path.join(dirname, 'commands')))
  ).filter((commandPath) => !excludeSet.has(path.parse(commandPath).name));

  logger.verbose(
    `Loading ${commandPaths.length} command(s): ${commandPaths.join(', ')}`
  );

  return Promise.all(
    commandPaths.map(async (filePath): Promise<CommandType> => {
      const fileUrl = pathToFileURL(filePath).href;
      const module = await import(fileUrl);
      const commandIsh = module?.default ?? undefined;
      if (commandIsh === undefined || commandIsh === null) {
        logger.warning('A command failed loading!');
        throw Error(`Failed to import command ${filePath}`);
      }

      if (!isCommand(commandIsh))
        throw Error(`${filePath} is not a valid command`);

      logger.verbose(`${path.basename(filePath)} loaded`);
      return commandIsh;
    })
  );
};

const cliArgs = minimist(process.argv.slice(2));
const verbose =
  cliArgs.verbose !== undefined || process.env.VERBOSE !== undefined;

// Initialize logger
const logger = winston.createLogger({
  // levels: winston.config.npm.levels, // Default
  format: winston.format.json(),
  transports: [
    // Logs with "error" level will be written to error.log
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'ss::mm::HH DD-MM-YYYY'
        }),
        winston.format.json()
      )
    }),
    // Logs with "error" or "warning" level will be written to warning.log
    new winston.transports.File({
      filename: 'warning.log',
      level: 'warn',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'ss::mm::HH DD-MM-YYYY'
        }),
        winston.format.json()
      )
    }),
    // Logs with levels "info" and below will be written to the console.
    new winston.transports.Console({
      level: verbose ? 'verbose' : 'info',
      format: winston.format.colorize()
    })
  ]
});

logger.verbose('Verbose logging is enabled');

const init = async () => {
  logger.info('Loading commands...');
  const commands = await loadCommands(logger);
  logger.info(`Successfully loaded ${commands.length} commands`);

  // Client construction
  const client = new BotClient(
    {
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
      ]
    },
    commands
  );

  client.once('ready', () => {
    logger.log(
      'info',
      'Logged in as: ' +
        (client.user?.tag ?? '¯\\_(ツ)_/¯') +
        ' - (' +
        (client.user?.id ?? '¯\\_(ツ)_/¯') +
        ')'
    );
  });

  if (process.env.TOKEN === undefined)
    throw new Error('Missing TOKEN environment variable');

  if (process.env.CLIENT_ID === undefined)
    throw new Error('Missing CLIENT_ID environment variable');

  // Interaction registration:
  const rest = new REST({ version: '9' }).setToken(process.env.TOKEN ?? '');
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID ?? ''), {
    body: [...client.interactionCommands.values()].map((c) => c.data.toJSON())
  });
  logger.info('Successfully registered application commands.');

  // Message handling (for old command format)
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;

      // Bot will listen for messages that starts with `!`
      if (message.content.startsWith('!')) {
        const args = message.content.substring(1).split(' ');
        const cmd = args[0].toLowerCase();

        const command = client.messageCommands.get(cmd);
        if (command !== undefined) {
          logger.info(`Command ${command.data.name} executed`);
          await command.handleMessage(message, client, logger);
          return;
        }
      } else {
        client.messageEvents.forEach((e) => e(message));
      }
    } catch (e) {
      logError(e, logger);
    }
  });

  // Interaction handling (new command system)
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!isApplicationInteraction(interaction)) return;

      const command = client.interactionCommands.get(interaction.commandName);
      if (command !== undefined) {
        logger.info(`Interaction ${command.data.name} executed`);
        await command.handleInteraction(interaction, client, logger);
      }
    } catch (e) {
      logError(e, logger);
    }
  });

  // Initiate database
  initDB();

  // Optional initialization for commands
  for (const command of commands) {
    await command.init?.(client, logger);
  }

  // Finalize initiation by logging in
  client.login(process.env.TOKEN ?? '');
};

try {
  await init();
} catch (e) {
  logError(e, logger);
}
