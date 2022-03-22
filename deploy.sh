#!/bin/sh
pkill screen
git fetch
git pull
git submodule update --recursive --init
yarn install
screen -S "discord-bot" -d -m -L -Logfile output.log bash -c "yarn start"