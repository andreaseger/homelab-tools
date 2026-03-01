FROM oven/bun:1-debian-bookworm

ARG VERSION=dev
ARG COMMIT_SHA=unknown

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="Headless Obsidian vault sync"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.revision="${COMMIT_SHA}"

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apps/obsidian-syncer/package*.json ./
RUN bun add -g obsidian-headless

COPY apps/obsidian-syncer/index.ts ./

RUN mv /usr/local/bin/ob /usr/local/bin/ob-headless || true

ENTRYPOINT ["bun", "run", "/app/index.ts"]
