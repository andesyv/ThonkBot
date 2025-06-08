# syntax=docker/dockerfile:1
FROM node:24-bookworm AS build
WORKDIR /app
COPY . .

# Install (runtime) dependencies and compile TypeScript
RUN npm install --omit=dev
RUN npm run build

# Create a file containing the hash of the currently checked out commit
# (used by the "patch" command to know which version is the currently deployed one)
# Afterwards, remove the .git folder as we won't need it anymore
RUN git rev-parse --short HEAD > gitVersionHash.txt \
 && rm -rf .git



# Run stage
FROM node:24-bookworm AS run

# Setup runtime dependencies
RUN apt-get update \
 && apt-get install -y imagemagick f3d python3 \
 && npm install -g pm2
# Create an alias for Python
RUN ln -s $(which python3) /usr/bin/python

COPY --from=build /app /app

# Environment variables
ENV CLIENT_ID="Your client ID"
ENV TOKEN="Your client bot token"
ENV GIPHY_KEY="Giphy token"

WORKDIR /data
CMD pm2-runtime start /app/ecosystem.config.cjs