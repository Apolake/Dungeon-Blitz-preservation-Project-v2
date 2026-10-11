# ==========================================
# Multi-stage Dockerfile for Dungeon Blitz
# ==========================================

# Stage 1: Build Modern Web Frontend
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci || npm install
COPY web/ ./
RUN npm run build

# Stage 2: Runtime Container (Python + SQLite + WebSocket Gateway)
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code and data
COPY server/ ./server/

# Copy compiled modern web client from Stage 1 into server/web_dist
COPY --from=web-builder /app/server/web_dist ./server/web_dist

# Persistent data directory for SQLite database & saves
ENV DATA_DIR=/data
ENV HOST=0.0.0.0
ENV PORT_HTTP=8080
ENV TCP_PORTS=8082

VOLUME ["/data"]

EXPOSE 8080 8082 843

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

WORKDIR /app/server
CMD ["python", "server.py"]
