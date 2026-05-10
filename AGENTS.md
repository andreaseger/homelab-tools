<!-- bun start -->

Use PNPM for package management and Bun as the runtime.

### Package management (PNPM)

- Use `pnpm install` to install dependencies
- Use `pnpm add <package>` to add a dependency
- Use `pnpm add -D <package>` to add a dev dependency
- Use `pnpm dlx <package> <command>` instead of `npx`
- Use `pnpm deploy --filter=<package> --prod <dir>` for isolated Docker builds

### Dockerfile pattern for monorepo apps

To avoid pulling sibling apps' (often native) deps into every image:

- The CI workflow (`.github/workflows/ci.yml`) sets `context: apps/<app>` and exposes the repo root as a named build context (`build-contexts: workspace=.`). Reference workspace files via `COPY --from=workspace ...`.
- Use the `# syntax=docker/dockerfile:1.10` directive at the top so `COPY --parents` is available, then copy the workspace config and member manifests as `COPY --parents --from=workspace apps/*/package.json ./`. The glob auto-picks up new apps; `--parents` preserves the `apps/<name>/` layout that pnpm needs to load the workspace graph (without it, all matches collapse to one file). `--frozen-lockfile` validates against every member's manifest even when filtering, so the glob has to cover them all.
- Install with `pnpm install --filter=<pkg>... --frozen-lockfile --config.node-linker=isolated` (note the trailing `...` — includes the package's transitive workspace deps). The `--config.node-linker=isolated` override is **required**: the workspace's `.npmrc` sets `node-linker=hoisted` for the Bun runtime, but with hoisted layout pnpm flattens *every* workspace member's deps into the root `node_modules` regardless of `--filter`, so sibling postinstall scripts (tree-sitter, better-sqlite3, ...) still run. Isolated layout makes the filter actually exclude them. The `pnpm deploy` step below produces a flat `node_modules` for runtime regardless of linker choice during build.
- With isolated layout, app binaries (vue-tsc, vite, tsc, ...) live under `apps/<app>/node_modules/.bin`, not the workspace root. Invoke them via `pnpm --filter=<pkg> exec <cmd>` rather than `/app/node_modules/.bin/<cmd>`.
- Produce the runtime bundle with `pnpm deploy --filter=<pkg> --prod /deploy` in the same builder stage; final stage just `COPY --from=builder /deploy/node_modules` plus the app's built artifacts. No separate `prod-deps` stage needed.
- Only add `python3 make g++` (for `node-gyp`) when the app's own dep closure actually contains a native module without a prebuilt binary for the target arch. Pure-JS apps need none.

See `apps/homelab-k8s-dashboard/Dockerfile` (pure-JS) and `apps/api-portal/Dockerfile` (native deps) as reference templates when creating a new app.

### Runtime (Bun)

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

<!-- bun end -->

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Pre-commit verification

Before committing, run the same checks CI runs to confirm the branch will be green:

```
pnpm nx affected -t format lint test build typecheck e2e-ci
```

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
