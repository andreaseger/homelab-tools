FROM oven/bun:1 AS builder

WORKDIR /app

# Replicate workspace structure for lockfile compatibility
COPY package.json bun.lock ./
COPY apps/api-portal/package.json apps/api-portal/
RUN bun install --frozen-lockfile

# Final runtime stage
FROM oven/bun:1

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="API Portal for OpenAPI and AsyncAPI specifications"

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-portal/node_modules ./apps/api-portal/node_modules

# Copy application code
COPY apps/api-portal/server ./server
COPY apps/api-portal/client ./client
COPY apps/api-portal/bunfig.toml ./
COPY apps/api-portal/tsconfig.json ./

# Default specs directory (mount from host)
ENV SPECS_DIR=/specs
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

RUN mkdir -p /specs

VOLUME ["/specs"]

ENTRYPOINT ["bun", "run", "server/index.ts"]
