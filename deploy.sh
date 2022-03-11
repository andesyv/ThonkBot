#!/bin/sh
pkill screen
git fetch
git pull
screen -S "discord-bot" -d -m -L -Logfile output.log bash -c "yarn start"