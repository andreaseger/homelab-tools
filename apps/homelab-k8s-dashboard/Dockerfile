# ---- Builder Stage ----
FROM node:22-slim AS builder

RUN corepack enable pnpm

WORKDIR /app

# Copy workspace config + all member manifests (required for --frozen-lockfile validation)
COPY --from=workspace package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --from=workspace apps/api-portal/package.json apps/api-portal/
COPY --from=workspace apps/obsidian-syncer/package.json apps/obsidian-syncer/
COPY --from=workspace apps/homelab-k8s-dashboard/package.json apps/homelab-k8s-dashboard/

# Install only this app's dependency closure — sibling apps' native deps are skipped
# node-linker=isolated overrides .npmrc's workspace-wide hoisted setting so
# --filter actually excludes sibling apps' deps; pnpm deploy below still
# produces a flat node_modules for the Bun runtime stage.
RUN pnpm install --filter=@apps/homelab-k8s-dashboard... --frozen-lockfile --config.node-linker=isolated

COPY --from=workspace apps/homelab-k8s-dashboard/src apps/homelab-k8s-dashboard/src
COPY --from=workspace apps/homelab-k8s-dashboard/tsconfig*.json apps/homelab-k8s-dashboard/
COPY --from=workspace apps/homelab-k8s-dashboard/vite.config.ts apps/homelab-k8s-dashboard/

# Type-check and emit server JS; bundle client with Vite. With isolated
# node-linker, binaries live under the app's own node_modules/.bin.
RUN pnpm --filter=@apps/homelab-k8s-dashboard exec vue-tsc --build \
 && pnpm --filter=@apps/homelab-k8s-dashboard exec vite build

# Produce an isolated prod-only deploy bundle
RUN pnpm deploy --filter=@apps/homelab-k8s-dashboard --prod /deploy

# ---- Production Stage ----
FROM oven/bun:1.3.13

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="K8s dashboard showing deployed container images and helm charts"

WORKDIR /app

COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /app/apps/homelab-k8s-dashboard/dist ./dist

ENV NODE_ENV=production

EXPOSE 8080

CMD ["bun", "run", "dist/server/server.js"]
