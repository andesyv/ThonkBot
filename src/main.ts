import { Client, Intents } from 'discord.js';
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});
import { token } from './../config.json';

client.once('ready', () => {
  console.log('ThonkBot initiated');
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  message.channel.send('Message received!');
});

client.login(token);
