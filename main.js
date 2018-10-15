var Discord = require('discord.js');
var winston = require('winston');
var commands = require('./commands.js');
var auth = require('./auth.json');


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
const bot = new Discord.Client({
   token: "auth.token"
});

bot.on('ready', function (evt) {
    logger.log('info','Connected');
    logger.log('info','Logged in as: ' + bot.user.tag + ' - (' + bot.user.id + ')');
});

bot.on('message', function (message) {
    commands.runCommand(bot, message, logger); // Run the command.
});

// In case of disconnect:
bot.on('disconnect', (event) => logger.log('info', 'Disconnected with close event: ' + event));

// Connect bot
bot.login('auth.token');

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
