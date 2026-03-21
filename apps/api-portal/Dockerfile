FROM node:22-slim AS deps

RUN corepack enable pnpm

WORKDIR /app

# Copy workspace config for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api-portal/package.json apps/api-portal/

RUN pnpm install --frozen-lockfile

# Deploy isolated production dependencies
RUN pnpm deploy --filter=@ohoio/api-portal --prod /deploy

# Final runtime stage — Bun for execution
FROM oven/bun:1

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="API Portal for OpenAPI and AsyncAPI specifications"

WORKDIR /app

# Copy only this app's production dependencies
COPY --from=deps /deploy/node_modules ./node_modules

# Copy application code
COPY apps/api-portal/server ./server
COPY apps/api-portal/client ./client
COPY apps/api-portal/bunfig.toml ./
COPY apps/api-portal/tsconfig.json ./

ENV SPECS_DIR=/specs
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

RUN mkdir -p /specs

VOLUME ["/specs"]

ENTRYPOINT ["bun", "run", "server/index.ts"]
