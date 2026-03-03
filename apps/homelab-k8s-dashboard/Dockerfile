# ---- Builder Stage ----
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY src/ ./src/
COPY tsconfig*.json vite.config.ts ./

# Type checking is handled by the CI pipeline (nx run typecheck).
# Only the server needs tsc --build for emit; the client just needs vite build.
RUN bun tsc --build tsconfig.server.json && bun vite build

# ---- Production Stage ----
FROM oven/bun:1

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="K8s dashboard showing deployed container images and helm charts"

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

RUN bun install --production

ENV NODE_ENV=production

EXPOSE 8080

CMD ["bun", "run", "dist/server/server.js"]
