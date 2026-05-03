FROM node:22-slim AS deps

RUN corepack enable pnpm

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=workspace package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --from=workspace apps/api-portal/package.json apps/api-portal/
COPY --from=workspace apps/obsidian-syncer/package.json apps/obsidian-syncer/
COPY --from=workspace apps/homelab-k8s-dashboard/package.json apps/homelab-k8s-dashboard/

RUN pnpm install --frozen-lockfile

# Deploy isolated production dependencies
RUN pnpm deploy --filter=@ohoio/api-portal --prod /deploy

# Final runtime stage — Bun for execution
FROM oven/bun:1

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="API Portal for OpenAPI and AsyncAPI specifications"

WORKDIR /app

COPY --from=deps /deploy/node_modules ./node_modules

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
