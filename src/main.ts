import { Client, Intents } from 'discord.js';
import winston from 'winston';
import { token, clientId, guildId } from './../config.json';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { readdir } from 'fs/promises';
import * as path from 'path';
import {
  ICommandBase,
  IMessageCommand,
  ISlashCommand,
  isMessageCommand,
  isSlashCommand
} from './command';

const init = async () => {
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

  const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
  });

  client.once('ready', () => {
    logger.log(
      'info',
      'Logged in as: ' + client.user?.tag ??
        '¯_(ツ)_/¯' + ' - (' + client.user?.id ??
        '¯_(ツ)_/¯' + ')'
    );
  });

  // Interaction registration:
  const commands = await loadCommands(logger);
  const interactionCommands = commands.filter((c) => isSlashCommand(c));

  const rest = new REST({ version: '9' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: interactionCommands.map((c) => c.data.toJSON())
  });
  logger.log('info', 'Successfully registered application commands.');

  // Message handling (for old command format)
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    logger.log('info', 'Received message');
    message.channel.send('Message received!');

    for (const command of commands) {
      if (isMessageCommand(command)) {
        await command.handleMessage(message, client, logger);
        return;
      }
    }
  });

  // Interaction handling (new command system)
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    logger.log('info', 'Received interaction');
    for (const command of interactionCommands) {
      if (
        isSlashCommand(command) &&
        command.data.name === interaction.commandName
      ) {
        await command.handleInteraction(interaction, client, logger);
        return;
      }
    }
  });

  // Finalize initiation by logging in
  client.login(token);
};

type CommandType =
  | ICommandBase
  | (ICommandBase & IMessageCommand)
  | (ICommandBase & IMessageCommand & ISlashCommand);

const loadCommands = async (logger: winston.Logger): Promise<CommandType[]> => {
  const commandNames = await readdir(path.join(__dirname, 'commands'));
  return Promise.all(
    commandNames.map(async (name): Promise<CommandType> => {
      logger.log('info', `Name is ${name}`);
      return (await import(`./commands/${name}`)).default;
    })
  );
};

init();
