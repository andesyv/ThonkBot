var Discord = require('discord.io');
var winston = require('winston');
var auth = require('./auth.json');
var fs = require('fs');

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
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});
bot.on('ready', function (evt) {
    logger.log('info','Connected');
    logger.log('info','Logged in as: ' + bot.username + ' - (' + bot.id + ')');
});
bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];

        args = args.splice(1);
        switch(cmd) {
            // !think
            case 'think':
            case 'thinking':
                bot.sendMessage({
                    to: channelID,
                    message: ':thinking:'
                });
                break;
            // !thonk
            case 'thonk':
            case 'thonking':
                bot.uploadFile({
                    to: channelID,
                    file: './ThonkEmojis/thonk.png'
                });
                break;
            case 'randomThonk':
            case 'randomThink':
            case 'randomthonk':
            case 'randomthink':
                var readDir = './ThonkEmojis/';
                fs.readdir(readDir, (err, files) => {
                    if (files.constructor === Array) {
                        var randomFile = files[Math.floor(Math.random() * files.length)];
                        bot.uploadFile({
                            to: channelID,
                            file: readDir + randomFile
                        });
                    }
                });
                break;

            default:
                break;
         }
     }
});
bot.on('disconnect', function (errMsg, code) {
    logger.log('info', 'Disconnected with error message: ' + errMsg);
});
