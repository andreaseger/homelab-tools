# Base image versions come from the repo's .tool-versions; CI and the local
# `docker:build` script both read it and pass them in. No defaults on purpose —
# an unset arg fails the build rather than silently drifting from the repo.
ARG NODE_VERSION
ARG BUN_VERSION
ARG PNPM_VERSION

# ---- Production dependencies ----
# Built under Node because better-sqlite3 (via obsidian-headless) needs node-gyp
# when there's no prebuilt binary for the target arch.
FROM node:${NODE_VERSION}-slim AS deps

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

ARG PNPM_VERSION
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME/bin:$PATH
# pnpm's own installer, pinned to PNPM_VERSION. Not Corepack: node:26-slim no
# longer ships that binary. SHELL/ENV are required — get-pnpm exits 1 when it
# cannot infer a shell to write its rc file into.
RUN SHELL="$(which sh)" ENV="$HOME/.shrc" npx --yes get-pnpm ${PNPM_VERSION}

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

# ---- Production ----
FROM oven/bun:${BUN_VERSION}

LABEL org.opencontainers.image.source="https://github.com/andreaseger/homelab-tools"
LABEL org.opencontainers.image.description="Headless Obsidian vault sync"

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY index.ts ./

# Create symlink for ob command
RUN ln -s /app/node_modules/.bin/ob /usr/local/bin/ob || \
    find /app/node_modules -name "ob" -executable -type f -exec ln -s {} /usr/local/bin/ob \; || true

ENTRYPOINT ["bun", "run", "index.ts"]
