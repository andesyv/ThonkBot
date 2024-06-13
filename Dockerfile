# syntax=docker/dockerfile:1

FROM node:20-alpine
WORKDIR /app
COPY . .

# Environment variables
ENV CLIENT_ID="Your client ID"
ENV TOKEN="Your client bot token"
ENV GIPHY_KEY="Giphy token"

# Install dependencies and compile TypeScript
RUN yarn install
RUN yarn global add pm2
RUN yarn run build

# Run
WORKDIR /data
CMD pm2-runtime start /app/ecosystem.config.cjs