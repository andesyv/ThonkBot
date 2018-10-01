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
                uploadRandomFile('./ThonkEmojis/');
                break;
            case 'spook':
            case 'Spook':
                uploadRandomFile('./Spooks/');
                break;
            case 'ManySpooks':
            case 'manyspooks':
            case 'Manyspooks':
            case 'manySpooks':
                var readDir = './Spooks/';
                fs.readdir(readDir, (err, files) => {
                    if (files.constructor === Array) {
                        for each (var file in files) {
                            bot.uploadFile({
                                to: channelID,
                                file: readDir + file
                            });
                        }
                    }
                });
                break;

            default:
                break;
         }
     }
});

function uploadRandomFile(folder) {
    var readDir = folder;
    fs.readdir(readDir, (err, files) => {
        if (files.constructor === Array) {
            var randomFile = files[Math.floor(Math.random() * files.length)];
            bot.uploadFile({
                to: channelID,
                file: readDir + randomFile
            });
        }
    });
}

bot.on('disconnect', function (errMsg, code) {
    logger.log('info', 'Disconnected with error message: ' + errMsg);
});

// Testcode taken from: https://github.com/synicalsyntax/discord.js-heroku/blob/web/index.js
// Credits to synicalsyntax

// Web app (Express + EJS)
const https = require('https');
const express = require('express');
const app = express();

// set the port of our application
// process.env.PORT lets the port be set by Heroku
const port = process.env.PORT || 5000;

// set the view engine to ejs
app.set('view engine', 'ejs');

// make express look in the `public` directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));

// set the home page route
app.get('/', (request, response) => {
    // ejs render automatically looks in the views folder
    response.render('index');
});

app.listen(port, () => {
    // will echo 'Our app is running on http://localhost:5000 when run locally'
    console.log('Our app is running on http://localhost:' + port);
});

// pings server every 15 minutes to prevent dynos from sleeping (cheeky)
setInterval(() => {
 https.get('https://thonk-bot.herokuapp.com');
}, 900000);
