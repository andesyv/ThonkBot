#!/bin/sh
pkill screen
git fetch
git pull
screen -S "discord-bot" -m bash -c "yarn start"