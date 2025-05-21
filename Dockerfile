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
# Enable yarn > 1.x
RUN corepack enable
RUN yarn set version stable

# Install dependencies and compile TypeScript
# Set production mode (making yarn only install non-dev dependencies)
RUN yarn workspaces focus --production
RUN yarn run build

# Run
WORKDIR /data
CMD pm2-runtime start /app/ecosystem.config.cjs