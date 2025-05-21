# syntax=docker/dockerfile:1

FROM node:20-alpine
WORKDIR /app
COPY . .

# Environment variables
ENV CLIENT_ID="Your client ID"
ENV TOKEN="Your client bot token"
ENV GIPHY_KEY="Giphy token"

# Global packages and configurations
RUN npm install -g pm2

# Install dependencies and compile TypeScript
RUN npm install --omit=dev
RUN npm run build

# Run
WORKDIR /data
CMD pm2-runtime start /app/ecosystem.config.cjs