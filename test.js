const christmasThonk = require('./lib/thonkbot-christmas');
var winston = require('winston');
var Discord = require('discord.js');
// var commands = require('./commands.js');
var github = require('octonode');


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

getLastCommit (new Discord.Message(), logger);
