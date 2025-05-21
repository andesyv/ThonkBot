#!/bin/sh
git fetch
git pull
git submodule update --recursive --init
npm install
tsc
pm2 restart ThonkBot
