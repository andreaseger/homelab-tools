FROM oven/bun:1 AS builder

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN bun install --production

# Final runtime stage
FROM oven/bun:1

ARG VERSION=dev
ARG COMMIT_SHA=unknown

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="Headless Obsidian vault sync"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.revision="${COMMIT_SHA}"

# Install runtime dependencies (needed for HTTPS connections to Obsidian Sync)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependencies from builder (includes compiled better-sqlite3)
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY index.ts ./

# Create symlink for ob command
RUN ln -s /app/node_modules/.bin/ob /usr/local/bin/ob || \
    find /app/node_modules -name "ob" -executable -type f -exec ln -s {} /usr/local/bin/ob \; || true

ENTRYPOINT ["bun", "run", "index.ts"]
