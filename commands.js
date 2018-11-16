var Discord = require('discord.js');
var fs = require('fs');
const jokes = require('./jokes.json');
const christmasThonk = require('./lib/thonkbot-christmas');

// Converts the message to a command and runs it.
exports.runCommand = function (bot, message, logger) {
    if (!(bot instanceof Discord.Client)) {
        throw "bot is not a valid Discord bot!";
    }

    // Bot will listen for messages that will start with `!`
    if (message.content.substring(0, 1) == '!') {
        var args = message.content.substring(1).split(' ');
        var cmd = args[0];

        args = args.splice(1);

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
        /* Spooktober is over. :/
        case 'SPOOK':
        case 'RANDOMSPOOK':
            sendRandomFile(message, './Spooks/', logger);
            break;
        case 'MANYSPOOKS':
        case 'ALLSPOOKS':
            sendManySpooks(message);
            break;
        */
        case 'CAT':
        case 'CATS':
        case 'RANDOMCAT':
            sendRandomFile(message, './Cats/', logger);
            break;
        case 'KNOCK':
        case 'KNOCKKNOCK':
            message.channel.send(jokes.KnockKnock[Math.floor(Math.random() * jokes.KnockKnock.length)]);
            break;
        case 'PEPPERKAKE':
            if (message.channel instanceof Discord.TextChannel) {
                christmasThonk.sendPepperkake(message, logger);
            }
            break;
        case 'SECRETSANTA':
            if (message.channel instanceof Discord.TextChannel) {
                christmasThonk.secretSanta(message, logger);
            }
            break;
        default:
            break;
     }
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
