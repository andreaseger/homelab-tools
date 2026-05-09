# syntax=docker/dockerfile:1-labs

# ---- Builder Stage ----
FROM node:22-slim AS builder

# Build deps for native modules pulled in by matterbridge / matter.js
# when no prebuilt binary exists for the target arch.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

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
RUN pnpm install --filter=@ohoio/kindle-hass-dashboard... --frozen-lockfile --config.node-linker=isolated

# Produce a flat prod-only deploy bundle. Forcing hoisted here is required for
# matterbridge: it self-locates package.json relative to its dist/ and breaks
# on pnpm's .pnpm/<pkg>/node_modules/<pkg> indirection from isolated layout.
RUN pnpm deploy --filter=@ohoio/kindle-hass-dashboard --prod --config.node-linker=hoisted /deploy

# ---- Production Stage ----
FROM oven/bun:1.3.13

LABEL org.opencontainers.image.source="https://github.com/andreaseger/homelab-tools"
LABEL org.opencontainers.image.description="Kindle Paperwhite HASS Dashboard Service"

WORKDIR /app

COPY --from=builder /deploy/node_modules ./node_modules

COPY server ./server
COPY widgets ./widgets
COPY shared  ./shared
COPY config  ./config
COPY matter-plugin ./matter-plugin
COPY kindle ./kindle
COPY fluxcd ./fluxcd
COPY bunfig.toml ./
COPY tsconfig.json ./
COPY entrypoint.sh ./

RUN bun build matter-plugin/src/index.ts --outdir matter-plugin/dist --target bun
RUN chmod +x entrypoint.sh

ENV NODE_ENV=production
ENV PORT=8080
ENV EXPOSE_PORT=8081
ENV MATTERBRIDGE_FRONTEND=8283

EXPOSE 8080 8081 8283

VOLUME ["/root/.matterbridge"]

ENTRYPOINT ["./entrypoint.sh"]
