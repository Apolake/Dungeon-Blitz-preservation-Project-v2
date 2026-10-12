# ==========================================
# All-in-One Dockerfile for Dungeon Blitz Revival Server & Client (v1.5.22)
# Serves authentic client + assets on port 8090
# and runs game server on TCP ports 8092 and 7498
# ==========================================

FROM node:20-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy package descriptors
COPY package*.json ./
COPY src/server/package*.json ./src/server/

# Install dependencies and build TypeScript
RUN npm install && cd src/server && npm install && npm run build

# Copy remaining source code and game assets
COPY . .

# Build again in case source files changed
RUN cd src/server && npm run build

ENV MULTIPLAYER_MODE=true
ENV STATIC_PORT=8090
ENV GAME_PORT=8092
ENV GAME_PORTS=8092,7498
ENV ENABLE_POLICY_SERVER=true

EXPOSE 8090 8092 7498 843

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8090/healthz || exit 1

WORKDIR /app/src/server
CMD ["node", "tools/startMultiplayerServer.js"]
