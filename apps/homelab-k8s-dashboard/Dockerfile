# ---- Builder Stage ----
FROM node:22-slim AS builder

RUN corepack enable pnpm

WORKDIR /app

# Copy workspace config for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/homelab-k8s-dashboard/package.json apps/homelab-k8s-dashboard/

RUN pnpm install --frozen-lockfile

COPY apps/homelab-k8s-dashboard/src apps/homelab-k8s-dashboard/src
COPY apps/homelab-k8s-dashboard/tsconfig*.json apps/homelab-k8s-dashboard/
COPY apps/homelab-k8s-dashboard/vite.config.ts apps/homelab-k8s-dashboard/

# Type-check and emit server JS; bundle client with Vite
RUN cd apps/homelab-k8s-dashboard && \
    /app/node_modules/.bin/vue-tsc --build && \
    /app/node_modules/.bin/vite build

# ---- Production dependencies ----
FROM node:22-slim AS prod-deps

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/homelab-k8s-dashboard/package.json apps/homelab-k8s-dashboard/

RUN pnpm install --frozen-lockfile

RUN pnpm deploy --filter=@apps/homelab-k8s-dashboard --prod /deploy

# ---- Production Stage ----
FROM oven/bun:1

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="K8s dashboard showing deployed container images and helm charts"

WORKDIR /app

COPY --from=prod-deps /deploy/node_modules ./node_modules
COPY --from=builder /app/apps/homelab-k8s-dashboard/dist ./dist

ENV NODE_ENV=production

EXPOSE 8080

CMD ["bun", "run", "dist/server/server.js"]
