# ThonkBot

A simple discord bot for thonking made using Node.js.

[Add it to your server!](https://discord.com/oauth2/authorize?&client_id=492017860068114444&scope=bot&permissions=201427968)

# Commands
Do a `!help` in a channel or in a dm to the bot directly for help and commands.

# Contributing
Contributions are more than welcome. Fork the repository, do your changes and make a pull request.

## Testing Environment
If you want to test features before making a pull request or if you wan't to 
host your own version of the bot, you'll have to create a bot instance and add 
it to a server where you have sufficient permissions.

### How do this?:
 1. First go to [the Discord developer portal](https://discord.com/developers/applications)
 2. Create a new application *(if you don't have one ready already)*
 3. Attach a bot to your application
 4. Create a JSON file in the root directory of the repository called
 **auth.json**. 
 5. Copy the bot token *(theres a reveal button and a copy 
 button at the bot page)* and paste it into the **auth.json** file under a 
 **token** attribute. Like this:
```json
{
    "token": "Your token here"
}
```
 5. Go back to your bot page and head to the **OAuth2** page.
 6. Mark the *bot* scope.
 7. Add any other permissions you need.
    - If the bot is missing a needed permission it will output an error when attempting to do an illegal action.
 8. Copy the generated link and use the link to add your bot to a server.
 9. Open a console in the root directory and run `npm install` in order to 
 install all needed packages specified in the **package.json** file.
 10. Finally run your application using `npm start` or `npm run start`.

# Licencing
The application is licenced under a standard [MIT licence](LICENCE)