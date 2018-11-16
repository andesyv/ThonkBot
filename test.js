const christmasThonk = require('./lib/thonkbot-christmas');
var winston = require('winston');
var Discord = require('discord.js');

// Initialize logger
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console({
        colorize: 'all'
    })
  ]
});

var client = new Discord.Client();
var sender = [
    new Discord.User(client, {username: 'TestUser1', discriminator: '1'}),
    new Discord.User(client, {username: 'TestUser2', discriminator: '2'})
];
var receiver = [
    new Discord.User(client, {username: 'TestUser2', discriminator: '2'}),
    new Discord.User(client, {username: 'TestUser1', discriminator: '1'})
];

logger.log('info', `Client is ${client}`);
for (let item in sender) {
    logger.log('info', `Sender is ${item.tag}`);
}
for (let item in receiver) {
    logger.log('info', `Receiver is ${item.username}`);
}

// Output result.
try {
    logger.log('info', `Validate rules returned: ${christmasThonk.validateRules(sender, receiver, logger)}`);
}
catch(err) {
    logger.log('error', `Validate rules failed with error: ${err}`);
}
