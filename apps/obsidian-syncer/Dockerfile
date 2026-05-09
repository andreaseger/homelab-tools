# ---- Builder Stage ----
FROM node:22-slim AS builder

# Build deps for native modules (better-sqlite3 via obsidian-headless) when no
# prebuilt binary exists for the target arch.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable pnpm

WORKDIR /app

# Copy workspace config + all member manifests (required for --frozen-lockfile validation)
COPY --from=workspace package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --from=workspace apps/api-portal/package.json apps/api-portal/
COPY --from=workspace apps/obsidian-syncer/package.json apps/obsidian-syncer/
COPY --from=workspace apps/homelab-k8s-dashboard/package.json apps/homelab-k8s-dashboard/

# Install only this app's dependency closure
# node-linker=isolated overrides .npmrc's workspace-wide hoisted setting so
# --filter actually excludes sibling apps' deps; pnpm deploy below still
# produces a flat node_modules for the Bun runtime stage.
RUN pnpm install --filter=@apps/obsidian-syncer... --frozen-lockfile --config.node-linker=isolated

# Produce an isolated prod-only deploy bundle
RUN pnpm deploy --filter=@apps/obsidian-syncer --prod /deploy

# ---- Production Stage ----
FROM oven/bun:1.3.13

LABEL org.opencontainers.image.source="https://github.com/andreaseger/homelab-tools"
LABEL org.opencontainers.image.description="Headless Obsidian vault sync"

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /deploy/node_modules ./node_modules

COPY index.ts ./

# Create symlink for ob command
RUN ln -s /app/node_modules/.bin/ob /usr/local/bin/ob || \
    find /app/node_modules -name "ob" -executable -type f -exec ln -s {} /usr/local/bin/ob \; || true

ENTRYPOINT ["bun", "run", "index.ts"]
