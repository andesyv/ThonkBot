#!/bin/sh
pkill screen
git pull
screen -S "discord-bot" -m bash -c "yarn start"