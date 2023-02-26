#!/bin/sh
git fetch
git pull
git submodule update --recursive --init
yarn install
tsc
pm2 restart ThonkBot
