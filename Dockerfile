# ==========================================
# All-in-One Dockerfile for Dungeon Blitz Server & Client
# Serves the authentic Flash client + assets on port 8090
# and runs the game server on TCP port 8092
# ==========================================

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

# Copy server code and authentic game assets
COPY server/ ./server/

# Persistent data directory for SQLite database
ENV DATA_DIR=/data
ENV HOST=0.0.0.0
ENV PORT_HTTP=8090
ENV TCP_PORTS=8092

VOLUME ["/data"]

EXPOSE 8090 8092 843

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8090/crossdomain.xml || exit 1

WORKDIR /app/server
CMD ["python", "server.py"]
