import { Client, Intents } from 'discord.js';
import winston, { loggers } from 'winston';
import { token, clientId, guildId } from './../config.json';
import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { readdir } from 'fs/promises';
import * as path from 'path';
import { BaseCommand, CommandApiConstructor, ICommandBase } from './command';

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

  // Message handling (for old command format)
  client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    logger.log('info', 'Received message');
    message.channel.send('Message received!');
  });

  // Interaction registration:
  const commands = (await loadCommands(logger)).map((c) => c.toJSON());

  // const cmd1 = new SlashCommandBuilder()
  //   .setName('ping')
  //   .setDescription('Replies with pong!');

  // const commands = [cmd1].map((command) => command.toJSON());

  const rest = new REST({ version: '9' }).setToken(token);

  rest
    .put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands
    })
    .then(() =>
      logger.log('info', 'Successfully registered application commands.')
    )
    .catch((e) => logger.log('error', e));

  // Interaction handling (new command system)
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    logger.log('info', 'Received interaction');
    if (commandName === 'ping') {
      await interaction.reply('Pong!');
    }
  });

  // Finalize initiation by logging in
  client.login(token);
};

const loadCommands = async (
  logger: winston.Logger
): Promise<ICommandBase[]> => {
  const commandNames = await readdir(path.join(__dirname, 'commands'));
  return Promise.all(
    commandNames.map(async (name): Promise<ICommandBase> => {
      logger.log('info', `Name is ${name}`);
      const { default: Command } = (await import(
        `./commands/${name}`
      )) as CommandApiConstructor;
      return new Command();
    })
  );
};

init();
