# ==============================================================================
# Polaris WhatsApp Bot & Cyberpunk Dashboard - Docker Container
# ==============================================================================
FROM node:20-bookworm-slim AS base

# Install system dependencies: ffmpeg, build-essential (python3, make, g++) for better-sqlite3, and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
    curl \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency specifications first for layer caching
COPY package*.json ./

# Install npm dependencies (including native rebuild for better-sqlite3)
RUN npm install --production --loglevel=warn

# Copy entire application source
COPY . .

# Ensure storage & state directories exist
RUN mkdir -p /app/auth_info /app/database /app/logs /app/tmp /app/downloads

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=3000

# Expose Web Dashboard & WebSocket port
EXPOSE 3000

# Health check to ensure server responds
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the unified Polaris Bot & Dashboard engine
CMD ["npm", "start"]
