var fs = require('fs');
var Discord = require('discord.io');

exports.runCommand = function (bot, cmd, args, user, userID, channelID, evt) {
    if (!(bot instanceof Discord.Client)) {
        throw "bot is not a valid Discord bot!";
    }

    cmd = cmd.toUpperCase(); // Convert to uppercase letters.

    switch(cmd) {
        // !think
        case 'THINK':
        case 'THINKING':
            bot.sendMessage({
                to: channelID,
                message: ':thinking:'
            });
            break;
        // !thonk
        case 'THONK':
        case 'THONKING':
            bot.uploadFile({
                to: channelID,
                file: './ThonkEmojis/thonk.png'
            });
            break;
        case 'RANDOMTHONK':
        case 'RANDOMTHINK':
            uploadRandomFile(bot, './ThonkEmojis/', channelID);
            break;
        case 'SPOOK':
            uploadRandomFile(bot, './Spooks/', channelID);
            break;
        case 'MANYSPOOKS':
            var readDir = './Spooks/';
            fs.readdir(readDir, (err, files) => {
                if (files.constructor === Array) {
                    files.forEach(function(element) {
                        bot.uploadFile({
                            to: channelID,
                            file: readDir + element
                        });
                });
                }
            });
            break;

        default:
            break;
     }
}

function uploadRandomFile(bot, folder, channelID) {
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
