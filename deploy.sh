#!/bin/sh
pkill screen
git fetch
git pull
screen -S "discord-bot" -d -m bash -c "yarn start"