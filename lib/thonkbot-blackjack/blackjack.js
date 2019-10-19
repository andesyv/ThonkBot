const fs = require('fs');

var blackjackTimeout = [];
var logger

exports.startGame = function (message, loggerObj)
{
    logger = loggerObj;

    var blackjackSessions = JSON.parse(fs.readFileSync('./blackjacksessions.json'));
    blackjackSessions.push({
        channel: message.channel
    });
    var sessionTimeout = 30.0;
    blackjackTimeout[blackjackSessions.length - 1] = setTimeout(endGame, sessionTimeout * 1000, blackjackSessions.length - 1);

    var jsonContent = JSON.stringify(blackjackSessions);
    fs.writeFile("blackjacksessions.json", jsonContent, 'utf8', (err) => {
        if (err) {
            logger.log('error', 'Failed to write to blackjack session file with error ' + err);
        }
    });
}

function endGame(index)
{
    var blackjackSessions = (JSON.parse(fs.readFileSync('blackjacksessions.json'))).Sessions;
    blackjackSessions.splice(index, 1);
    var jsonContent = JSON.stringify(blackjackSessions);
    fs.writeFile("blackjacksessions.json", jsonContent, 'utf8', (err) => {
        if (err) {
            logger.log('error', 'Failed to write to blackjack session file with error ' + err);
        }
    });
}
