#!/bin/sh
pkill screen
git fetch
git pull
yarn install
screen -S "discord-bot" -d -m -L -Logfile output.log bash -c "yarn start"