const christmasThonk = require('./lib/thonkbot-christmas');
var winston = require('winston');
var Discord = require('discord.js');
// var commands = require('./commands.js');
var github = require('octonode');
const fs = require('fs');


// Initialize logger
const logger = winston.createLogger({
  level: 'debug',
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

var client = new Discord.Client();
var sender = [
    new Discord.User(client, {username: 'TestUser1', discriminator: '1'}),
    new Discord.User(client, {username: 'TestUser2', discriminator: '2'})
];
var receiver = [
    new Discord.User(client, {username: 'TestUser2', discriminator: '2'}),
    new Discord.User(client, {username: 'TestUser1', discriminator: '1'})
];

/*
logger.log('info', `Client is ${client}`);
for (let item in sender) {
    logger.log('info', `Sender is ${item.tag}`);
}
for (let item in receiver) {
    logger.log('info', `Receiver is ${item.username}`);
}
*/

function getLastCommit (message, logger, args) {
    /*git.getLastCommit((err, commit) => {
        message.channel.send('Last commit:\n"' + commit.subject + '\n' + commit.body + '"\nAuthor: ' + commit.author.email);
    });*/

    var client = github.client();
    client.get('/users/andesyv', {}, (err, status, body, headers) => {
        // logger.log('info', body);
        // logger.log('info', headers);
    });

    var ghrepo = client.repo('andesyv/ThonkBot');

    // var ghsearch = client.search();

    ghrepo.info((err, data, headers) => {
        // logger.log('info', 'Data: ' + data);
        // console.log(data);
    });
    ghrepo.commits((err, data, headers) => {
        console.log('Last commit:\n' + data[0].commit.message + '\nBy: ' + data[0].commit.author.name + '\nDate: ' + data[0].commit.author.date + '\nUrl: ' + data[0].html_url);
        // data.commit.author.name
        // data.commit.author.date
        // data.commit.message
        // data.html_url
        // message.channel.send('Last commit:\n"' + data.commit.message + '"\nBy: ' + data.commit.author.name + '\nDate: ' + data.commit.author.date + '\nUrl: ' + data.commit.html_url);
        // console.log('\n\nAlso length is: ' + data.length);
    });
}

/** Shuffles array in place.
 * Modern version of Fisher-Yates (aka Knuth) Shuffle. ES6 version
 * @param {Array} a items An array containing the items.
 * @see https://bost.ocks.org/mike/shuffle/ and https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function sendManySpooks (message, logger) {
    let readDir = './Spooks/';
    let spookList = Array(4);
    for (var i = 0; i < spookList.length; ++i)
        spookList[i] = Array();

    let files = fs.readdirSync(readDir);

    if (files.constructor === Array) {
        // Shuffle Array
        files = shuffle(files);

        var i = 0, messageSize = 0;
        files.forEach((file) => {
            logger.log('info', `File is ${file}`)
            if (messageSize >= 8 * 1024 * 1024)
            {
                i++;
                messageSize = 0;
            }

            logger.log('info', `spooklist is ${spookList}`);

            spookList[i].push({
                attachment: readDir + file,
                name: file
            });

            messageSize += fs.statSync(readDir + file).size;

            // logger.log('info', `i is ${i} and messageSize is ${messageSize}`);
        });
    }

    for (var i = 0; i < spookList.length; i++)
    {
        logger.log('info', `Spooklist ${i}:`);
        for (var object in spookList[i])
        {
            logger.log('info', spookList[i][object].name);
        }
    }

    // for (let list in spookList)
    // {
    //     message.channel.send({
    //         files: list
    //     });
    // }
}

// sendManySpooks(new Discord.Message(), logger);
// getLastCommit (new Discord.Message(), logger);

logger.log('info', 'This is an info message!');
logger.log('warn', 'This is a warning!');
logger.log('error', 'This is an error!');
