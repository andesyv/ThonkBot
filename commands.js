var Discord = require('discord.js');
const fs = require('fs');
var github = require('octonode');
const jokes = require('./jokes.json');
const compliments = require('./compliments.json');
const christmas = require('./christmas.json');
const quotes = require('./quotes.json');
const christmasThonk = require('./lib/thonkbot-christmas');
const path = require('path');
const SQLite = require("better-sqlite3");
const sql = new SQLite('./db.sqlite');
const { DateTime, Duration } = require('luxon');

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
        case 'HELP':
        case 'HALP':
        case '?':
            fs.readFile(path.join(__dirname, './help.md'), 'utf8', (err, data) => {
                if (err)
                    logger.log('error', 'Failed to send help with error: ' + err);
                else
                    message.channel.send(data);
            });
            break;
        
        case 'COMMANDS':
        case 'CMDS':
        case 'CMD':
            message.channel.send('Full list of commands:\n\n' +
                'help, halp, ?, commands, cmds, cmd, ' +
                'bachelor, bachelorleft, bachelortimeleft, ' +
                'pilot, pilotleft, think, thinking, thonk thonking, ' +
                'randomthonk, randomthink, christmasname, christmas-name, ' +
                'cat, cats, randomcat, cola, coke, cocacola, pepsi, nezuko, ' +
                'anime, weeb, wholesome, pokemon, randompokemon, pikachu, ' +
                'pikapika, ash, knock, knockknock, pepperkake, christmas, jul, ' +
                'compliments, compliment, comp, kompliment, lotr, hobbit, ' +
                'gandalf, hodor, got, movie, quote, patch, patchnotes, ' +
                'notes, new, request, requests, todo, completerequest, ' +
                'deleterequest, removerequest, secretsanta');
            break;
        case 'BACHELOR':
        case 'BACHELORLEFT':
        case 'BACHELORTIMELEFT':
        case 'PILOT':
        case 'PILOTLEFT':
            {
            let p = percentageTowardsDate(new Date('Jan 6, 2020 9:00:00'), new Date('May 20, 2020 12:00:00'));
            let before = p <= 100;
            message.channel.send(`Time ` + (before ? 'left until' : 'since') + ` bachelor deadline: ${timeLeft(new Date('May 20, 2020 12:00:00'), before)}\n` +
            (before ? `Percentage: ${p.toFixed(2)}%` : `You're done! :o`));
            }
            break;
        // !think
        case 'THINK':
        case 'THINKING':
            message.channel.send(':thinking:');
            break;
        // !thonk
        case 'THONK':
        case 'THONKING':
            message.channel.send(new Discord.MessageAttachment(path.join(__dirname, 'ThonkEmojis', 'thonk.png')));
            break;
        case 'RANDOMTHONK':
        case 'RANDOMTHINK':
            sendRandomFile(message, path.join(__dirname, 'ThonkEmojis'), logger);
            break;
        case 'SPOOK':
        case 'RANDOMSPOOK':
            if (message.mentions.users.size > 0)
                sendPersonalSpook(message, path.join(__dirname, 'Spooks'), logger);
            else
                sendRandomFile(message, path.join(__dirname, 'Spooks'), logger);
            break;
        case 'MANYSPOOKS':
        case 'ALLSPOOKS':
            sendManySpooks(message, logger);
            break;
        case 'CHRISTMASNAME':
        case 'CHRISTMAS-NAME':
            if (message.channel instanceof Discord.TextChannel) {
                christmasThonk.christmasName(message, logger);
            }
            break;
        case 'CAT':
        case 'CATS':
        case 'RANDOMCAT':
            sendRandomFile(message, path.join(__dirname, 'Cats'), logger);
            break;
        case 'COLA':
        case 'COKE':
        case 'COCACOLA':
        case 'PEPSI':
            sendRandomFile(message, path.join(__dirname, 'Coke'), logger);
            break;
        case 'NEZUKO':
        case 'ANIME':
        case 'WEEB':
        case 'WHOLESOME':
            sendRandomFile(message, path.join(__dirname, 'Anime'), logger);
            break;
        case 'POKEMON':
        case 'RANDOMPOKEMON':
        case 'PIKACHU':
        case 'PIKAPIKA':
        case 'ASH':
            sendRandomFile(message, path.join(__dirname, 'Pokemon'), logger);
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
        case 'CHRISTMAS':
        case 'JUL':
            if (message.mentions.users.size > 0)
                sendPersonalChristmasGreeting(message, logger);
            else
                  message.channel.send(christmas.Christmas[Math.floor(Math.random() * christmas.Christmas.length)]);

            break;
        case 'COMPLIMENTS':
        case 'COMPLIMENT':
        case 'COMP':
        case 'KOMPLIMENT':
            if (message.mentions.users.size > 0)
                sendPersonalCompliment(message, logger);
            else
                  message.channel.send(compliments.Compliments[Math.floor(Math.random() * compliments.Compliments.length)]);
            break;
// ... Quotes from movies and tv-show
        case 'LOTR':
        case 'HOBBIT':
        case 'GANDALF':
          message.channel.send(quotes.LOTR[Math.floor(Math.random() * quotes.LOTR.length)]);
        break;

        case 'HODOR':
        case 'GOT':
        message.channel.send(quotes.GOT[Math.floor(Math.random() * quotes.GOT.length)]);
        break;

        case 'MOVIE':
        case 'QUOTE':
        message.channel.send(quotes.MovieQuotes[Math.floor(Math.random() * quotes.MovieQuotes.length)]);
        break;

        case 'PATCH':
        case 'PATCHNOTES':
        case 'NOTES':
        case 'NEW':
            getLastCommit(message, logger, args);
            break;
        case 'REQUEST':
            fs.appendFile(path.join(__dirname, 'requests.txt'), message.content.slice(cmd.length + 2) + '\n', (err) => {
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
            removeRequest(message, args, logger);
            break;
        case 'SECRETSANTA':
            if (message.channel instanceof Discord.TextChannel) {
                christmasThonk.secretSanta(message, logger);
            }
            break;
        case 'SERVERCOUNT':
        case 'SERVERS':
        case 'GUILDCOUNT':
        case 'GUILDS':
            message.channel.send('As far as I know, I currently reside in ' + bot.guilds.cache.size + ' servers.');
            break;
        case 'POINT':
        case 'POINTS':
            let pointsObj = getUserPoints(message.author);
            message.channel.send(`${message.author.tag} has ${pointsObj.points} sthonks:tm:.`);
            break;
        case 'GAMBLE':
        case 'BET':
            let p = getUserPoints(message.author);
            if (p.points === 0)
                message.channel.send(`You're broke!`);
            else {
                let amount = 0;
                let arg = args[0];
                if (arg)
                    if (arg.toUpperCase() === "ALL")
                        amount = p.points;
                    else if (Number(arg))
                        amount = Number(arg);
                
                if (!amount)
                    message.channel.send(`You have to specify an amount to gamble.`);
                else {
                    let r = Math.round(Math.random() * 100);
                    let factor = ((r / 100) * 2 - 1); // Convert from [0, 100] to [-1, 1]
                    p.points = Math.max(p.points + Math.round(Math.pow(amount, 2) * factor), 0);
                    updatePoints(p);
                    message.channel.send(`${message.author.tag} bet **${amount}** sthonks, rolled a **${r}**, and now has **${p.points}** sthonks.`);
                }
            }
            break;
        default:
            break;
     }
}

function updatePoints(obj) {
    const setScore = sql.prepare("UPDATE bank SET points = @points WHERE id = @id;");
    setScore.run(obj);
}

function initTable() {
    const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'bank';").get();
    if (!table['count(*)']) {
        sql.prepare(`CREATE TABLE bank (
            bid INTEGER PRIMARY KEY,
            id TEXT,
            user TEXT,
            points INTEGER
        );`).run();
        sql.prepare("CREATE UNIQUE INDEX idx_scores_id ON bank (id);").run();
        sql.prepare(`CREATE TABLE metabank (
            id INTEGER PRIMARY KEY,
            bid INTEGER NO NULL,
            lastupdated TEXT)`).run();
        sql.prepare(`
            CREATE TRIGGER recordtime AFTER UPDATE ON bank
            BEGIN
                UPDATE metabank SET lastupdated=datetime('now') WHERE bid = NEW.bid;
            END;`).run();
    }
}

function getUserPoints (user) {
    initTable();
    let obj = sql.prepare(`SELECT * FROM bank WHERE user = \'${user.tag}\'`).get();
    if (!obj) {
        obj = {
            id: user.id,
            user: user.tag,
            points: 100
        };
        sql.prepare(`INSERT INTO bank(id, user, points) VALUES (@id, @user, @points);`).run(obj);
        sql.prepare(`INSERT INTO metabank(bid, lastupdated) VALUES ((SELECT bid FROM bank WHERE id = @id), datetime('now'));`).run(obj);
    } else {
        let sqltime = sql.prepare(`select lastupdated from metabank where bid = (select bid from bank where id = \'${obj.id}\');`).get().lastupdated;
        let accessed = DateTime.fromSQL(sqltime, { zone: 'utc' });
        obj.points += Math.floor(Duration.fromMillis(DateTime.local() - accessed).as("minute"));
    }
    return obj;
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
                msg += data[i].commit.message + '\nBy: ' + data[i].commit.author.name + '\nDate: ' + data[i].commit.author.date + '\nUrl: <' + data[i].html_url + '>';
                if (i !== amount.length - 1 || i !== data.length - 1) {
                    msg += '\n\n';
                }
            }
            message.channel.send(msg);
        } else if (0 < data.length) {
            message.channel.send('Last commit:\n' + data[0].commit.message + '\nBy: ' + data[0].commit.author.name + '\nDate: ' + data[0].commit.author.date + '\nUrl: <' + data[0].html_url + '>');
        } else {
            message.channel.send("Couldn't receive any commits.");
        }
    });
}

function removeRequest (message, args, logger) {
    if (0 < args.length && !isNaN(args[0])) {
        fs.readFile(path.join(__dirname, 'requests.txt'), 'utf8', (err, data) => {
            if (err) {
                message.channel.send('There are no requests.');
                logger.log('info', "Didn't remove file because: " + err.message);
                return;
            }
            var contents = data.split('\n');
            if (args[0] < 1 || args[0] > contents.length - 1) {
                logger.log('info', "Didn't remove request because it was out of range");
                message.channel.send('Please choose a request number that is on the request list to remove.')
            } else {
                var newContents = '';
                for (let i = 0; i < contents.length - 1; i++) {
                    if (i == (args[0] - 1))
                        logger.log('warn', `User ${message.author.tag} removed request: ${contents[i]}`);
                    else
                        newContents += contents[i] + '\n';
                }
                if (newContents === '') {
                    fs.unlink(path.join(__dirname, 'requests.txt'), (err) => {
                        if (err) {
                            logger.log('error', err.message);
                            throw err;
                        }
                        logger.log('info', 'Removed requests.txt because it was empty.');
                        message.channel.send('Done!');
                    });
                } else {
                    fs.writeFile(path.join(__dirname, 'requests.txt'), newContents, 'utf8', (err) => {
                        if (err) {
                            logger.log('error', err.message);
                            throw err;
                        }
                        // Writing successful.
                        message.channel.send('Done!');
                    });
                }
            }
        });
    } else {
        message.channel.send('Must specify which request to remove.');
    }
}

function getRequests (message, logger) {
    fs.readFile(path.join(__dirname, 'requests.txt'), 'utf8', (err, data) => {
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

function sendManySpooks (message, logger) {
    let readDir = path.join(__dirname, 'Spooks/');
    let spookList = [];
    let files = fs.readdirSync(readDir);

    if (files.constructor === Array) {
        // Shuffle Array
        files = shuffle(files);

        var messageSize = 0;
        files.forEach((file) => {
            let fileSize = fs.statSync(path.join(readDir, file)).size;

            if (messageSize + fileSize < 8 * 1024 * 1024 && spookList.length < 10)
            {
                spookList.push({
                    attachment: readDir + file,
                    name: file
                });

                messageSize += fileSize;
            }
        });
    }

    if (0 < spookList.length)
    {
        message.channel.send({
            files: spookList
        });
    }
}

function sendRandomFile(message, folder, logger) {
    let file = getRandomFile(folder);
    if (typeof file == "string") {
        message.channel.send(new Discord.MessageAttachment(path.join(folder, file)));
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
             new Discord.MessageAttachment(folder + file));
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
         value.send(`${christmas.Christmas[Math.floor(Math.random() * christmas.Christmas.length)]} Best Regards ${message.author.tag}!` )

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
        value.send(compliments.Compliments[Math.floor(Math.random() * compliments.Compliments.length)]);
    }).catch(() => {
        logger.log('error', `Failed to create dm channel with user ${mentioned.tag} on textChannel ${message.channel.name}`);
    });
}

function timeLeft(date, before = true){
    if (date instanceof Date){
        let inMs = {};
        inMs.second = 1000;
        inMs.min = inMs.second * 60;
        inMs.hour = inMs.min * 60;
        inMs.day = inMs.hour * 24;

        let now = Date.now();
        let left = before ? (date - now) : (now - date);
        let days = Math.floor(left / inMs.day),
            hours = Math.floor((left % inMs.day) / inMs.hour),
            mins = Math.floor((left % inMs.day % inMs.hour) / inMs.min),
            seconds = Math.floor((left % inMs.day % inMs.hour % inMs.min) / inMs.second);

        return `${days} days, ${hours} hours, ${mins} mins, ${seconds} seconds left`;
    }
    return null;
}

function percentageTowardsDate(from, to){
    if (from instanceof Date && to instanceof Date){
        let now = Date.now();
        let passed = now - from;
        let percentage = passed / (to - from);
        return percentage * 100;
    }
    return null;
}
