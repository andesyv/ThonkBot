import { Intents } from 'discord.js';
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
import { initWords } from './commands/wordle';

type CommandType =
  | ICommandBase
  | (ICommandBase & IMessageCommand)
  | (ICommandBase & IMessageCommand & ISlashCommand);

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
      intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
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
    body: client.interactionCommands.map((c) => c.data.toJSON())
  });
  logger.log('info', 'Successfully registered application commands.');

  // Message handling (for old command format)
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;

      // Bot will listen for messages that starts with `!`
      if (message.content.startsWith('!')) {
        const args = message.content.substring(1).split(' ');
        const cmd = args[0].toUpperCase();

        for (const command of client.messageCommands) {
          if (
            isMessageCommand(command) &&
            (command.data.name.toUpperCase() === cmd ||
              command.aliases?.map((c) => c.toUpperCase()).includes(cmd))
          ) {
            logger.log('info', `Command ${command.data.name} executed`);
            await command.handleMessage(message, client, logger);
            return;
          }
        }
      }
    } catch (e) {
      logger.log('error', e);
    }
  });

  // Interaction handling (new command system)
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isCommand()) return;

      for (const command of client.interactionCommands) {
        if (
          isSlashCommand(command) &&
          command.data.name === interaction.commandName
        ) {
          logger.log('info', `Interaction ${command.data.name} executed`);
          await command.handleInteraction(interaction, client, logger);
          return;
        }
      }
    } catch (e) {
      logger.log('error', e);
    }
  });

  // Initiate database
  initDB();

  void initWords(logger);

  // Finalize initiation by logging in
  client.login(token);
};

init();
