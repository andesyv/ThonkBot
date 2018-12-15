var Discord = require('discord.js');
var fs = require('fs');
var Ajv = require('ajv');
const secretsantaSchema = require('./schemas/secretsantaRules.json');

exports.christmasName = function (message, logger) {
    const christmasEmojis = ['🎄', '🌟', '🍰', '🎁', '🎀', '⛸', '✨', '❄', '🎅']; // Send me to coding-jail now, please.
    var currentNickname = message.member.displayName;
    for (let i = 0; currentNickname.length <= 32; i++) {
        let randomEmoji = christmasEmojis[Math.floor(Math.random() * christmasEmojis.length)];
        if (randomEmoji.length + 1 + currentNickname.length > 32) {
            break;
        }

        if (i % 2 == 0) {
            currentNickname = randomEmoji + ' ' + currentNickname;
        } else {
            currentNickname += ' ' + randomEmoji;
        }
    }
    message.member.setNickname(currentNickname).catch((err) => {
        logger.log('error', err);
    });
    message.channel.send(`Your new christmas name is ${message.member.displayName}!`);
}

exports.secretSanta = function (message, logger) {
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

    try{
        // Shuffle as long as there are elements that are the same in the arrays.
        while (hasSharedElement(participants, receivers) || !validateRules(participants, receivers, logger)) {
            receivers = shuffle(receivers);
        }
    }
    catch(err) {
        logger.log('error', `Validation failed with the following error: ${err}`);
        return;
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

function validateRules (a, b, logger) {
    // Get rules
    var rules = getRules();

    if (rules != null) {
        var ajv = new Ajv();
        var validate = ajv.compile(secretsantaSchema);
        let validation = validate(rules);

        if (validation) {
            if (rules.hasOwnProperty('pairs')) {
                // Prevent infinite loops for arrays of size 2
                if ((Array.isArray(a) && 2 == a.length) || (Array.isArray(b) && 2 == b.length)) {
                    logger.log('info', 'Attempted to use pair rules on arrays of size 2. (infinite loop)');
                    return true;
                }

                if (rules.pairs.hasOwnProperty('exclude')) {
                    for (let pairIndex = 0; pairIndex < rules.pairs.exclude.length; pairIndex += 2) {
                        let currentPair = rules.pairs.exclude[pairIndex];
                        excludeProtocol(a, b, currentPair);
                    }
                }
                if (rules.pairs.hasOwnProperty('include')) {
                    for (let pairIndex = 0; pairIndex < rules.pairs.include.length; pairIndex += 2) {
                        let currentPair = rules.pairs.include[pairIndex];
                        includeProtocol(a, b, currentPair);
                    }
                }
            }
        } else if (validation.errors) {
            throw "Validation failed with errors: " + validation.errors;
        } else {
            throw "Custom rules doesn't follow schema.";
        }
    } else {
        logger.log('info', `No rules specified. Everything checks out.`)
    }

    return true;
}

function includeProtocol(a, b, pair) {
    if (Array.isArray(a) && Array.isArray(b) && 0 < a.length && 0 < b.length) {
        if (a[0] instanceof Discord.User && b[0] instanceof Discord.User) {
            let pairIncluded = false;
            for (let i = 0; i < a.length && i < b.length; i++) {
                if (a[i].tag === pair[0] && b[i].tag === pair[1]) {
                    pairIncluded = true;
                }
            }

            // The pair wasn't included anywhere. Return false.
            if (!pairIncluded) {
                logger.log('info', 'Caught a rule violation!');
                return false;
            }
        } else {
            throw "a and/or b isn't of type Discord.User";
        }
    } else if (Array.isArray(a) && Array.isArray(b)) {
        throw "a and/or b has a length of 0. Either both or none of a and b must be an array."
    } else {
        // Do validation against non-arrays.
        if (a instanceof Discord.User && b instanceof Discord.User) {
            let pairIncluded = false;
            if (a.tag === pair[0] && b.tag === pair[1]) {
                pairIncluded = true;
            }

            // The pair wasn't included anywhere. Return false.
            if (!pairIncluded) {
                logger.log('info', 'Caught a rule violation!');
                return false;
            }
        } else {
            throw "a and/or b isn't of type Discord.User";
        }
    }
}

function excludeProtocol(a, b, pair) {
    if (Array.isArray(a) && Array.isArray(b) && 0 < a.length && 0 < b.length) {
        if (a[0] instanceof Discord.User && b[0] instanceof Discord.User) {
            // Validation against arrays.
            for (let i = 0; i < a.length && i < b.length; i++) {
                if (a[i].tag === pair[0] && b[i].tag === pair[1]) {
                    logger.log('info', 'Caught a rule violation!');
                    return false;
                }
            }
        } else {
            throw "a and/or b isn't of type Discord.User";
        }
    } else if (Array.isArray(a) && Array.isArray(b)) {
        throw "a and/or b has a length of 0. Either both or none of a and b must be an array."
    } else {
        // Valuation against non-arrays.
        if (a instanceof Discord.User && b instanceof Discord.User) {
            if (a.tag === pair[0] && b.tag === pair[1]) {
                logger.log('info', 'Caught a rule violation!');
                return false;
            }
        } else {
            throw "a and/or b isn't of type Discord.User";
        }
    }
}

function getRules() {
    let path = './lib/thonkbot-christmas/rules/secretsanta/';
    let files = fs.readdirSync(path);
    try {
        for (let i = 0; i < files.length; i++) {
            let args = files[i].split('.');
            if (Array.isArray(args) && 0 < args.length) {
                let extension = args[args.length - 1];
                if (extension.toUpperCase() === 'JSON') {
                    // It's a json file!
                    let file = fs.readFileSync(path + files[i]);
                    return JSON.parse(file);
                }
            }
        }
    }
    catch(err) {
        throw "JSON parsing failed with following error: " + err.error;
    }
    return null;
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

exports.sendPepperkake = function (message, logger) {
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

exports.validateRules = validateRules;
