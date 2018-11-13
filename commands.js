var Discord = require('discord.js');
var fs = require('fs');
const jokes = require('./jokes.json');

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
                sendPepperkake(message, logger);
            }
            break;
        case 'SECRETSANTA':
            if (message.channel instanceof Discord.TextChannel) {
                secretSanta(message, logger);
            }
            break;
        default:
            break;
     }
}

function secretSanta (message, logger) {
    let participants = Array.from(message.mentions.users.values());

    // Check for crash
    if (participants == null || !Array.isArray(participants) || participants.length < 1) {
        message.channel.send('You have to specify users who is participating in the secret santa by "mentioning" them. ( !secretSanta @firstPerson @secondPerson )');
        return;
    } else if (participants.length == 1) {
        message.channel.send("You can't have a secret santa with yourself. Mention more users.");
        return;
    } else if (isAnyUserBots(participants)) {
        message.channel.send("Bots can't participate in a secret santa. Mention users only.");
        return;
    }

    // Copy participants array into receivers and shuffle it.
    let receivers = participants.slice();
    receivers = shuffle(receivers);

    // Shuffle as long as there are elements that are the same in the arrays.
    while (hasSharedElement(participants, receivers)) {
        receivers = shuffle(receivers);
    }

    // Send a message to each participant with their corresponding receiver.
    for (let i = 0; i < participants.length; i++) {
        let newDMChannel = participants[i].createDM();
        newDMChannel.then((value) => {
            value.send("Your secret santa is: " + receivers[i].tag);
        }).catch(() => {
            logger.log('error', `Failed to create dm channel with user ${participants[i].tag} on textChannel ${message.channel.name}`);
        });
    }
}

function isAnyUserBots(a) {
    if (Array.isArray(a)) {
        for (let i = 0; i < a.length; i++) {
            if (a[i] instanceof Discord.User && a[i].bot) {
                return true;
            }
        }
    }
    return false;
}

// Checks if for every index i in array there are any a[i] === b[i]
function hasSharedElement(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        for (let i = 0; i < a.length && i < b.length; i++) {
            if (a[i] === b[i]) {
                return true;
            }
        }
        return false;
    } else {
        return a === b;
    }
}

function sendPepperkake (message, logger) {
    let mentioned = message.mentions.users.first();
    // Check for crash
    if (mentioned == null) {
        message.channel.send('Nei!');
        return;
    }

    let newDMChannel = mentioned.createDM();
    newDMChannel.then((value) => {
        value.send('Du må gi en pepperkake til ' + message.author.tag);
    }).catch(() => {
        logger.log('error', `Failed to create dm channel with user ${mentioned.tag} on textChannel ${message.channel.name}`);
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
