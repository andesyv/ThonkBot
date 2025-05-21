# ThonkBot

A simple discord bot for thonking made using Node.js, Discord.js and TypeScript.

[Add it to your server!](https://discord.com/api/oauth2/authorize?client_id=492017860068114444&permissions=10939132992&scope=bot%20applications.commands)

# Commands

The slash-commands added should be visible by doing `/` in a text field in the Discord
client. Most of the slash-commands have normal text-command equivilants, which can be
accessed using `!` instead of `/` (example: `/cat` and `!cat`). Some text commands also have
additional aliases. All currently available text-commands and aliases can be found using
`!commands`;

# Contributing

Contributions are more than welcome! Fork the repository, do your changes and make a pull
request.

## Testing Environment

If you want to test features before making a pull request or if you want to
host your own version of the bot, you'll have to create a bot instance and add
it to a server where you have sufficient permissions before running the bot as
a Node.JS application.

### How do this?:

1. First go to [the Discord developer portal](https://discord.com/developers/applications)
2. Create a new application _(if you don't have one ready already)_
3. Attach a bot to your application
4. Clone the repository locally: `git clone https://github.com/andesyv/ThonkBot.git`
5. Copy the `template.env` to a file called `.env` in the root directory of the repository and fill it with you discord client ID, your bot token and a Giphy API key (optional).
6. This bot reads nicknames and message content, and therefore requires the "server member intent" and "message content intent" to be checked.
7. Head to the _OAuth2_ -> _URL Generator_ tab
8. Mark the _bot_ and _applications.commands_ scopes, and any additional permissions you think you'll need (or just Administrator for everything). You may get error messages if attempting to perform actions the bot does not have access to.
9. Use the generated link to add your bot to a server.
10. Install all the requirements for the bot. Below are some Linux instructions, but Windows follows a similar approach:
```sh
# Install Node.JS > 18
sudo apt install -y nodejs

# Install the required Node package manager (yarn) either via your distributions package manager or via npm:
sudo apt install -y yarn
sudo npm install -g yarn

# Install required packages:
yarn install
```
12. Finally, run the application. If `tsx` is installed (`npm install -g tsx`) you can run the `start` script directly:
```sh
yarn start # Using yarn
tsx src/main.ts # Using tsx
```
or you can compile the typescript and run the JS instead:
```sh
tsc # requires TypeScript to be globally installed
node ./dist/src/main.js
```

# Licensing

The application is licenced under a standard [MIT license](LICENSE)
