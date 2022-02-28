# ThonkBot

A simple discord bot for thonking made using Node.js, Discord.js and TypeScript.

[Add it to your server!](https://discord.com/api/oauth2/authorize?client_id=492017860068114444&permissions=201451520&scope=bot%20applications.commands)

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

If you want to test features before making a pull request or if you wan't to
host your own version of the bot, you'll have to create a bot instance and add
it to a server where you have sufficient permissions.

### How do this?:

1. First go to [the Discord developer portal](https://discord.com/developers/applications)
2. Create a new application _(if you don't have one ready already)_
3. Attach a bot to your application
4. Clone the repository locally: `git clone https://github.com/andesyv/ThonkBot.git`
5. Create a JSON file in the root directory of the repository called
   **config.json**.
6. Copy the bot token _(Click the reveal or copy button)_ and the bot client id _(OAuth2 -> General -> Client id)_ and paste it into the **config.json** file under a
   **token** and **clientId** attribute. Like this:

```json
{
  "token": "Your token here",
  "clientId": "Your client id here"
}
```
7. This bot reads nicknames and message content, and therefore requires the "server member intent" and "message content intent" to be checked.
8. Head to the _OAuth2_ -> _URL Generator_ tab
9.  Mark the _bot_ and _applications.commands_ scopes, and any additional permissions you think you'll need (or just Administrator for everything). You may get error messages if attempting to perform actions the bot does not have access to.
10.  Use the generated link to add your bot to a server.
11.  Open a console in the root directory and run `yarn` in order to download and install all dependencies. (You can also do `npm install` or any other package manager if you don't like `yarn`)
12. Finally run your application using `yarn start` / `npm start`.

# Licencing

The application is licenced under a standard [MIT license](LICENSE)
