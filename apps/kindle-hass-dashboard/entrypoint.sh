#!/usr/bin/env bash
set -e

if [ "${EXPOSE_ENABLED:-false}" = "true" ]; then
  bun /app/node_modules/matterbridge/dist/cjs/cli.js --add /app/matter-plugin --bridge &
fi

exec bun run server/index.ts
