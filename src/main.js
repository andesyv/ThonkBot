var Discord = require('discord.js');
var winston = require('winston');
var commands = require('./commands.js');
var auth = require('./auth.json');
const fs = require('fs');
var schedule = require('node-schedule');
const dns = require('dns');

var settings = JSON.parse('{ "adminUser": "USER#TAG" }');

exports.init = function()
{
  // Initialize logger
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      //
      // - Write to all logs with level `info` and below to `combined.log`
      // - Write all logs error (and below) to `error.log`.
      //
      new winston.transports.File({ filename: 'error.log', level: 'error',
                                      format: winston.format.combine(
                                          winston.format.timestamp({
                                          format: 'ss::mm::HH DD-MM-YYYY'
                                        }),
                                        winston.format.json()
                                        ),
                                    }),
      new winston.transports.File({ filename: 'warning.log', level: 'warn',
                                      format: winston.format.combine(
                                          winston.format.timestamp({
                                          format: 'ss::mm::HH DD-MM-YYYY'
                                        }),
                                        winston.format.json()
                                        ),
                                    }),
      new winston.transports.Console({
          colorize: 'all'
      })
    ]
  });

  // Read bot settings (settings for the environment)
  logger.log('info', 'Reading settings.');
  fs.readFile('./settings.json', (err, data) => {
    if (err) {
      logger.log('info', 'Failed to read settings, creating default settings file.');
      fs.writeFile("settings.json", JSON.stringify(settings, null, '\t'), 'utf8', (err) => {
        if (err)
          logger.log('error', 'Failed to create settings file.');
      });
    } else {
      settings = JSON.parse(data);
    }


    // Initialize Discord Bot
    const bot = new Discord.Client({
      token: auth.token
    });

    bot.on('ready', function (evt) {
      logger.log('info', 'Connected');
      logger.log('info', 'Logged in as: ' + bot.user.tag + ' - (' + bot.user.id + ')');
      initSettings(logger, bot);
      commands.initTable();
    });

    bot.on('message', function (message) {
      commands.runCommand(bot, message, logger); // Run the command.
    });

    // In case of disconnect:
    bot.on('disconnect', (event) => logger.log('info', 'Disconnected with close event: ' + event));

    // Connect bot
    bot.login(auth.token);
  });
}

function initSettings(logger, bot) {
  logger.log('info', 'Cached user count: ' + bot.users.cache.size);
  for (let [snowflake, user] of bot.users.cache) {
    bot.users.fetch(snowflake)
    .then((user) => {
      if (settings.adminUser instanceof Discord.User) {
        // Altough nothing got done we resolve this promise
        // because we already have done the work before.
        return Promise.resolve('Already found an admin user.');
      }
      if (user && user.tag === settings.adminUser) {
        logger.log('info', 'Admin user found and registered: ' + user.tag)
        settings.adminUser = user;
        scheduleIPValidationTimer(logger);
        // Do one validation check at startup
        validateIP(logger);
      }
    }, (err) => {
      logger.log('error', 'Failed to fetch user because: ' + err);
    });
  }
}

function scheduleIPValidationTimer(logger) {
  logger.log('info', 'Setting up scheduled job for ip validation.');

  // Setup timer for ip validation checking:
  schedule.scheduleJob({ hour: 18, minute: 0 }, () => {
    validateIP(logger);
  });
}

function validateIP(logger)
{
  const validationdomains = ['jallaboika.com', 'screamingpotato.ddns.net'];

  if (settings.adminUser instanceof Discord.User) {
    let domainsSame = new Promise((resolve, reject) => {
      dns.lookup(validationdomains[0], (err, address, family) => {
        if (err) reject(err);
        else resolve(address);
      });
    })
    .then((address1) => {
      return new Promise((resolve, reject) => {
        dns.lookup(validationdomains[1], (err, address2, family) => {
          if (err) reject(err);
          else resolve([address1, address2]);
        });
      });
    })
    .then((addresses) => {
      if (Array.isArray(addresses)) {
        if (addresses[0] !== addresses[1])
          return Promise.reject(`Ip-address doesn\'t match: ${addresses[0]}(${validationdomains[0]}) and ${addresses[1]}(${validationdomains[1]})`);
      } else {
        logger.log('error', 'Promise that was promised an array value didn\'t get an array as parameter for some reason.');
      }
    })
    // Catch error 1, 2 or 3 if they exist.
    .catch((dnserror) => {
      settings.adminUser.createDM().catch((err) => {
        logger.log('error', 'Failed to create dm channel with admin user.');
      }).then((dm) => {
        dm.send('Hey ' + settings.adminUser.tag + '!\nIp validation failed with the following error: ' + dnserror);
      });
    });
  }
}



if (require.main === module)
{
    exports.init();
}

// Testcode taken from: https://github.com/synicalsyntax/discord.js-heroku/blob/web/index.js
// Credits to synicalsyntax

// // Web app (Express + EJS)
// const https = require('https');
// const express = require('express');
// const app = express();
//
// // set the port of our application
// // process.env.PORT lets the port be set by Heroku
// const port = process.env.PORT || 5000;
//
// // set the view engine to ejs
// app.set('view engine', 'ejs');
//
// // make express look in the `public` directory for assets (css/js/img)
// app.use(express.static(__dirname + '/public'));
//
// // set the home page route
// app.get('/', (request, response) => {
//     // ejs render automatically looks in the views folder
//     response.render('index');
// });
//
// app.listen(port, () => {
//     // will echo 'Our app is running on http://localhost:5000 when run locally'
//     console.log('Our app is running on http://localhost:' + port);
// });
//
// // pings server every 15 minutes to prevent dynos from sleeping (cheeky)
// setInterval(() => {
//  https.get('https://thonk-bot.herokuapp.com');
// }, 900000);
