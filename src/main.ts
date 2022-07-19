import {
  BaseInteraction,
  ChatInputCommandInteraction,
  GatewayIntentBits,
  InteractionType
} from 'discord.js';
import winston from 'winston';
import { token, clientId } from './../config.json';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { readdir, stat } from 'fs/promises';
import * as path from 'path';
import {
  ICommandBase,
  IMessageCommand,
  ISlashCommand,
  isMessageCommand,
  isSlashCommand
} from './command';
import { initDB } from './dbutils';
import BotClient from './client';
import { logError } from './utils';

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
      (
        await readdir(root)
      ).map(async (name) => {
        const filePath = path.join(root, name);
        return (await stat(filePath)).isDirectory()
          ? await fetchCommandPaths(filePath)
          : filePath;
      })
    )
  ).flat();
};

const loadCommands = async (logger: winston.Logger): Promise<CommandType[]> => {
  const commandPaths = await fetchCommandPaths(
    path.join(__dirname, 'commands')
  );
  return Promise.all(
    commandPaths.map(async (filePath): Promise<CommandType> => {
      logger.log('info', `Loading command ${path.basename(filePath)}`);
      return (await import(filePath)).default;
    })
  );
};

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
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
    new winston.transports.Console({
      format: winston.format.colorize()
    })
  ]
});

const init = async () => {
  const commands = await loadCommands(logger);

  // Client construction
  const client = new BotClient(
    {
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
      ]
    },
    commands
  );

  client.once('ready', () => {
    logger.log(
      'info',
      'Logged in as: ' + client.user?.tag ??
        '¯\\_(ツ)_/¯' + ' - (' + client.user?.id ??
        '¯\\_(ツ)_/¯' + ')'
    );
  });

  // Interaction registration:
  const rest = new REST({ version: '9' }).setToken(token);
  await rest.put(Routes.applicationCommands(clientId), {
    body: [...client.interactionCommands.values()].map((c) => c.data.toJSON())
  });
  logger.log('info', 'Successfully registered application commands.');

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
          logger.log('info', `Command ${command.data.name} executed`);
          await command.handleMessage(message, client, logger);
          return;
        }
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
        logger.log('info', `Interaction ${command.data.name} executed`);
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
  client.login(token);
};

init();
