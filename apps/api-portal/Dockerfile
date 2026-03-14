FROM oven/bun:1 AS builder

WORKDIR /app

# Replicate workspace structure for lockfile compatibility
COPY package.json bun.lock ./
COPY apps/api-portal/package.json apps/api-portal/
RUN bun install --frozen-lockfile

# Copy source and build frontend
COPY apps/api-portal/ apps/api-portal/
RUN cd apps/api-portal && bunx vite build

# Final runtime stage
FROM oven/bun:1

LABEL org.opencontainers.image.source="https://github.com/ane/homelab-tools"
LABEL org.opencontainers.image.description="API Portal for OpenAPI and AsyncAPI specifications"

WORKDIR /app

# Copy runtime dependencies (js-yaml needed by server)
COPY --from=builder /app/apps/api-portal/node_modules ./node_modules

# Copy server code and built frontend (includes vendor/ with swagger-editor UMD)
COPY --from=builder /app/apps/api-portal/server ./server
COPY --from=builder /app/apps/api-portal/dist ./dist

# Default specs directory (mount from host)
ENV SPECS_DIR=/specs
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Create specs volume mount point
RUN mkdir -p /specs

VOLUME ["/specs"]

ENTRYPOINT ["bun", "run", "server/index.ts"]
