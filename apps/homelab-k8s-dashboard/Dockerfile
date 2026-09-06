# Base image version comes from the repo's .tool-versions; CI and the local
# `docker:build` script both read it and pass it in. No default on purpose —
# an unset arg fails the build rather than silently drifting from the repo.
ARG NODE_VERSION
ARG PNPM_VERSION

# ---- Production dependencies ----
FROM node:${NODE_VERSION}-slim AS deps
ARG PNPM_VERSION
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME/bin:$PATH
# pnpm's own installer, pinned to PNPM_VERSION. Not Corepack: node:26-slim no
# longer ships that binary. SHELL/ENV are required — get-pnpm exits 1 when it
# cannot infer a shell to write its rc file into.
RUN SHELL="$(which sh)" ENV="$HOME/.shrc" npx --yes get-pnpm ${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---- Builder ----
FROM node:${NODE_VERSION}-slim AS builder
ARG PNPM_VERSION
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME/bin:$PATH
# pnpm's own installer, pinned to PNPM_VERSION. Not Corepack: node:26-slim no
# longer ships that binary. SHELL/ENV are required — get-pnpm exits 1 when it
# cannot infer a shell to write its rc file into.
RUN SHELL="$(which sh)" ENV="$HOME/.shrc" npx --yes get-pnpm ${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.client.json tsconfig.server.json tsconfig.node.json vite.config.ts ./
COPY src ./src
# Emits dist/server via tsc and bundles dist/client via Vite. No vue-tsc: the
# client tsconfig inherits noEmit from @vue/tsconfig, so vue-tsc only ever
# type-checked, which the `typecheck` script covers in CI.
RUN pnpm run build

# ---- Production ----
# This app has to run on Node. @kubernetes/client-node authenticates to the API
# server through a node-fetch https.Agent carrying the in-cluster CA, and Bun's
# native fetch silently ignores the `agent` option, so under Bun the CA is never
# applied and every API call fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE.
# Do not switch this to a Bun base image.
FROM node:${NODE_VERSION}-slim

LABEL org.opencontainers.image.source="https://github.com/andreaseger/homelab-tools"
LABEL org.opencontainers.image.description="K8s dashboard showing deployed container images and helm charts"

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

USER node
EXPOSE 8080

CMD ["node", "dist/server/server.js"]
