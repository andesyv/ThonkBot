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
        case 'SPOOK':
            sendRandomFile(message, './Spooks/', logger);
            break;
        case 'MANYSPOOKS':
            sendManySpooks(message);
            break;
        case 'CAT':
        case 'CATS':
            sendRandomFile(message, './Cats/', logger);
            break;
        case 'KNOCK':
        case 'KNOCKKNOCK':
            message.channel.send(jokes.KnockKnock[Math.floor(Math.random() * jokes.KnockKnock.length)]);
            break;
        case 'PEPPERKAKE':
            var member = message.mentions.users[0];
            member.send('Du må gi en pepperkake');
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

// Fisher-Yates (aka Knuth) Shuffle
// See: https://bost.ocks.org/mike/shuffle/
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}
