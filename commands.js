var Discord = require('discord.js');
const fs = require('fs');
var github = require('octonode');
const jokes = require('./jokes.json');
const compliments = require('./compliments.json');
const christmas = require('./christmas.json');
// const christmasThonk = require('./lib/thonkbot-christmas');

// Converts the message to a command and runs it.
exports.runCommand = function (bot, message, logger) {
    if (!(bot instanceof Discord.Client)) {
        throw "bot is not a valid Discord bot!";
    }

    // Bot will listen for messages that will start with `!`
    if (message.content.substring(0, 1) == '!') {
        var args = message.content.substring(1).split(' ');
        var cmd = args[0];

        args = args.slice(1);

        parseCommand(bot, cmd, args, message, logger)
    }
}

// Bind command to functionality
function parseCommand(bot, cmd, args, message, logger) {
    cmd = cmd.toUpperCase(); // Convert to uppercase letters.

    switch(cmd) {
        // !think
        case 'THINK':
        case 'THINKING':
            message.channel.send(':thinking:');
            break;
        // !thonk
        case 'THONK':
        case 'THONKING':
            message.channel.send(new Discord.Attachment('./ThonkEmojis/thonk.png'));
            break;
        case 'RANDOMTHONK':
        case 'RANDOMTHINK':
            sendRandomFile(message, './ThonkEmojis/', logger);
            break;
        case 'SPOOK':
        case 'RANDOMSPOOK':
            if (message.mentions.users.size > 0)
                sendPersonalSpook(message, './Spooks/', logger);
            else
                sendRandomFile(message, './Spooks/', logger);
            break;
        case 'MANYSPOOKS':
        case 'ALLSPOOKS':
            sendManySpooks(message);
            break;
        /* Christmas is over
        case 'CHRISTMASNAME':
        case 'CHRISTMAS-NAME':
            if (message.channel instanceof Discord.TextChannel) {
                christmasThonk.christmasName(message, logger);
            }
            break;
        */
        case 'CAT':
        case 'CATS':
        case 'RANDOMCAT':
            sendRandomFile(message, './Cats/', logger);
            break;
        case 'COLA':
        case 'COKE':
        case 'COCACOLA':
        case 'PEPSI':
            sendRandomFile(message, './Coke/', logger);
            break;
        case 'NEZUKO':
        case 'ANIME':
        case 'WEEB':
        case 'WHOLESOME':
            sendRandomFile(message, './Anime/', logger);
            break;
        case 'POKEMON':
        case 'RANDOMPOKEMON':
        case 'PIKACHU':
        case 'PIKAPIKA':
        case 'ASH':
            sendRandomFile(message, './Pokemon/', logger);
            break;
        case 'KNOCK':
        case 'KNOCKKNOCK':
            message.channel.send(jokes.KnockKnock[Math.floor(Math.random() * jokes.KnockKnock.length)]);
            break;
        /* Christmas is over
        case 'PEPPERKAKE':
            if (message.channel instanceof Discord.TextChannel) {
                christmasThonk.sendPepperkake(message, logger);
            }
            break;
        */
        case 'CHRISTMAS':
        case 'JUL':
        if (message.mentions.users.size > 0)
            sendPersonalChristmasGreeting(message, logger);
        else
              message.channel.send(christmas.Christmas[Math.floor(Math.random() * christmas.Christmas.length)]);

        break;

        case 'COMPLIMENTS':
        if (message.mentions.users.size > 0)
            sendPersonalCompliment(message, logger);
        else
              message.channel.send(compliments.Compliments[Math.floor(Math.random() * compliments.Compliments.length)]);
        
        break;

        case 'PATCH':
        case 'PATCHNOTES':
        case 'NOTES':
        case 'NEW':
            getLastCommit(message, logger, args);
            break;
        case 'REQUEST':
            fs.appendFile('requests.txt', message.content.slice(cmd.length + 2) + '\n', (err) => {
                if (err) {
                    throw err;
                }
                message.channel.send('Request was accepted.');
            });
            break;
        case 'REQUESTS':
        case 'TODO':
            getRequests(message, logger);
            break;
        case 'COMPLETEREQUEST':
        case 'DELETEREQUEST':
        case 'REMOVEREQUEST':
            removeRequest(message, logger);
            break;

        /* Christmas is over
        case 'SECRETSANTA':
            if (message.channel instanceof Discord.TextChannel) {
                christmasThonk.secretSanta(message, logger);
            }
            break;
        */
        default:
            break;
     }
}

function getLastCommit (message, logger, args) {
    var client = github.client();

    var ghrepo = client.repo('andesyv/ThonkBot');

    ghrepo.commits((err, data, headers) => {
        var msg = '';
        if (0 < args.length && !isNaN(args[0])) {
            let amount = Number(args[0]);
            msg += `Last ${Number(args)} commits:\n`;
            for (let i = 0; i < amount && i < data.length; i++) {
                msg += data[i].commit.message + '\nBy: ' + data[i].commit.author.name + '\nDate: ' + data[i].commit.author.date + '\nUrl: ' + data[i].html_url;
                if (i !== amount.length - 1 || i !== data.length - 1) {
                    msg += '\n\n';
                }
            }
            message.channel.send(msg);
        } else if (0 < data.length) {
            message.channel.send('Last commit:\n' + data[0].commit.message + '\nBy: ' + data[0].commit.author.name + '\nDate: ' + data[0].commit.author.date + '\nUrl: ' + data[0].html_url);
        } else {
            message.channel.send("Couldn't receive any commits.");
        }
    });
}

function removeRequest (message, logger) {
    fs.readFile('requests.txt', 'utf8', (err, data) => {
        if (err) {
            message.channel.send('There are no requests.');
            logger.log('info', "Didn't remove file because: " + err.message);
            return;
        }
        var contents = data.split('\n');
        var newContents = '';
        for (let i = 0; i < contents.length - 2; i++) {
            // if (i == contents.length - 2) continue; // Skip if it's the last line.
            newContents += contents[i] + '\n';
        }
        if (newContents === '') {
            fs.unlink('requests.txt', (err) => {
                if (err) throw err;
                logger.log('info', 'Removed requests.txt because it was empty.');
                message.channel.send('Done!');
            });
        } else {
            fs.writeFile('requests.txt', newContents, 'utf8', (err) => {
                if (err) throw err;
                // Writing successful.
                message.channel.send('Done!');
            });
        }
    });
}

function getRequests (message, logger) {
    fs.readFile('requests.txt', 'utf8', (err, data) => {
        if (err) {
            message.channel.send('There are no requests at the moment.');
            logger.log('info', "Didn't read file because: " + err.message);
            return;
        }

        var requests = data.split('\n');
        var m = 'Requests:\n';
        for (let i = 0; i < requests.length; i++) { // - 1 because there's always one \n at the very end.
            if (requests[i].length < 1) {
                continue;
            } else {
                m += (i + 1) + '. ' + requests[i] + '\n';
            }
        }

        message.channel.send(m);
    });
}

function sendManySpooks (message) {
    let readDir = './Spooks/';
    let spookList = [];
    let files = fs.readdirSync(readDir);

    if (files.constructor === Array) {
        // Shuffle Array
        files = shuffle(files);

        files.forEach(
            (element) => spookList.push({
                attachment: readDir + element,
                name: element
            })
        );
    }

    message.channel.send({
        files: spookList
    });
}

function sendRandomFile(message, folder, logger) {
    let file = getRandomFile(folder);
    if (typeof file == "string") {
        message.channel.send(new Discord.Attachment(folder + file));
    } else {
        logger.log('error', 'Cannot find random file in ' + folder);
    }
}

function getRandomFile(folder) {
    let files = fs.readdirSync(folder);
    if (files.constructor === Array) {
        var randomFile = files[Math.floor(Math.random() * files.length)];
        return randomFile;
    }
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

 function sendPersonalSpook(message, folder, logger) {
     let mentioned = message.mentions.users.first();
     // Check for crash
     if (mentioned == null) {
         message.channel.send('Nei!');
         return;
     }

     let newDMChannel = mentioned.createDM();
     newDMChannel.then((value) => {
         let file = getRandomFile(folder);
         if (typeof file == "string") {
             value.send(`You've been spooked by ${message.author.tag}!`,
             new Discord.Attachment(folder + file));
         } else {
             logger.log('error', 'Cannot find random file in ' + folder);
         }
     }).catch(() => {
         logger.log('error', `Failed to create dm channel with user ${mentioned.tag} on textChannel ${message.channel.name}`);
     });
 }

 function sendPersonalChristmasGreeting(message, logger){
   let mentioned = message.mentions.users.first();
   // Check for crash
   if (mentioned == null) {
       message.channel.send('Nei!');
       return;
     }
     let newDMChannel = mentioned.createDM();
     newDMChannel.then((value) => {
         if (typeof file == "string") {
             value.send(`${christmas.Christmas[Math.floor(Math.random() * christmas.Christmas.length)]} Best Regards ${message.author.tag}!` )
         } else {
             logger.log('error', 'Cannot find random christmas greeting!');
         }
     }).catch(() => {
         logger.log('error', `Failed to create dm channel with user ${mentioned.tag} on textChannel ${message.channel.name}`);
     });
}
function sendPersonalCompliment(message, logger){
  let mentioned = message.mentions.users.first();
  // Check for crash
  if (mentioned == null) {
      message.channel.send('Nei!');
      return;
    }
    let newDMChannel = mentioned.createDM();
    newDMChannel.then((value) => {
        if (typeof file == "string") {
            value.send(`${compliments.Compliments[Math.floor(Math.random() * compliments.Compliments.length)]} Best Regards ${message.author.tag}!` )
        } else {
            logger.log('error', 'Cannot find random christmas greeting!');
        }
    }).catch(() => {
        logger.log('error', `Failed to create dm channel with user ${mentioned.tag} on textChannel ${message.channel.name}`);
    });
}
