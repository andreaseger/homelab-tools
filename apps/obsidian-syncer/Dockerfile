FROM node:22-slim AS deps

RUN corepack enable pnpm

# Build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace config for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/obsidian-syncer/package.json apps/obsidian-syncer/

RUN pnpm install --frozen-lockfile

# Deploy isolated production dependencies
RUN pnpm deploy --filter=@apps/obsidian-syncer --prod /deploy

# Final runtime stage — Bun for execution
FROM oven/bun:1

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="Headless Obsidian vault sync"

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only this app's production dependencies
COPY --from=deps /deploy/node_modules ./node_modules

# Copy application code
COPY apps/obsidian-syncer/index.ts ./

# Create symlink for ob command
RUN ln -s /app/node_modules/.bin/ob /usr/local/bin/ob || \
    find /app/node_modules -name "ob" -executable -type f -exec ln -s {} /usr/local/bin/ob \; || true

ENTRYPOINT ["bun", "run", "index.ts"]
