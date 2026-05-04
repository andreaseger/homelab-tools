FROM node:22-slim AS deps

RUN corepack enable pnpm

WORKDIR /app

COPY --from=workspace package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --from=workspace apps/api-portal/package.json apps/api-portal/
COPY --from=workspace apps/obsidian-syncer/package.json apps/obsidian-syncer/
COPY --from=workspace apps/homelab-k8s-dashboard/package.json apps/homelab-k8s-dashboard/
COPY --from=workspace apps/kindle-hass-dashboard/package.json apps/kindle-hass-dashboard/

RUN pnpm install --frozen-lockfile

RUN pnpm deploy --filter=@ohoio/kindle-hass-dashboard --prod /deploy

FROM oven/bun:1

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="Kindle Paperwhite HASS Dashboard Service"

WORKDIR /app

COPY --from=deps /deploy/node_modules ./node_modules

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
