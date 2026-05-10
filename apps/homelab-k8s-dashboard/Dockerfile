# syntax=docker/dockerfile:1-labs

# ---- Builder Stage ----
FROM node:22-slim AS builder

RUN corepack enable pnpm

WORKDIR /app

# Copy workspace config + all member manifests (required for --frozen-lockfile validation).
# --parents preserves the apps/<name>/ structure pnpm needs, so adding a new app
# under apps/ is picked up automatically without editing any Dockerfile.
COPY --from=workspace package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --parents --from=workspace apps/*/package.json ./

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

LABEL org.opencontainers.image.source="https://github.com/andreaseger/homelab-tools"
LABEL org.opencontainers.image.description="K8s dashboard showing deployed container images and helm charts"

WORKDIR /app

COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /app/apps/homelab-k8s-dashboard/dist ./dist

ENV NODE_ENV=production

EXPOSE 8080

CMD ["bun", "run", "dist/server/server.js"]
