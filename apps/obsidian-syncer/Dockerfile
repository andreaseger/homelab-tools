FROM oven/bun:1 AS builder

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Replicate workspace structure for lockfile compatibility
COPY package.json bun.lock ./
COPY apps/obsidian-syncer/package.json apps/obsidian-syncer/
RUN bun install --frozen-lockfile --production

# Final runtime stage
FROM oven/bun:1

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="Headless Obsidian vault sync"

# Install runtime dependencies (needed for HTTPS connections to Obsidian Sync)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependencies from builder (includes compiled better-sqlite3)
COPY --from=builder /app/apps/obsidian-syncer/node_modules ./node_modules

# Copy application code
COPY apps/obsidian-syncer/index.ts ./

# Create symlink for ob command
RUN ln -s /app/node_modules/.bin/ob /usr/local/bin/ob || \
    find /app/node_modules -name "ob" -executable -type f -exec ln -s {} /usr/local/bin/ob \; || true

ENTRYPOINT ["bun", "run", "index.ts"]
