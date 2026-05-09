# ---- Builder Stage ----
FROM node:22-slim AS builder

# Build deps for native modules pulled in by api-portal's deps (tree-sitter via
# swagger-editor) when no prebuilt binary exists for the target arch.
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
RUN pnpm install --filter=@ohoio/api-portal... --frozen-lockfile --config.node-linker=isolated

# Produce an isolated prod-only deploy bundle
RUN pnpm deploy --filter=@ohoio/api-portal --prod /deploy

# ---- Production Stage ----
FROM oven/bun:1

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="API Portal for OpenAPI and AsyncAPI specifications"

WORKDIR /app

COPY --from=builder /deploy/node_modules ./node_modules

COPY server ./server
COPY client ./client
COPY bunfig.toml ./
COPY tsconfig.json ./

ENV SPECS_DIR=/specs
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

RUN mkdir -p /specs

VOLUME ["/specs"]

ENTRYPOINT ["bun", "run", "server/index.ts"]
