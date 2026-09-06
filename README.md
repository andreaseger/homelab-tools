# Homelab Tools

Containerized applications for homelab infrastructure, kept in one git repo as
**independent packages**.

There is no pnpm workspace and no Nx. Each directory under `apps/` has its own
`package.json`, `pnpm-lock.yaml`, `node_modules`, `tsconfig.json` and `Dockerfile`.
Nothing is shared between apps except the CI workflow and `.tool-versions`, so
updating one app never means touching another.

## Apps

- **[homelab-k8s-dashboard](apps/homelab-k8s-dashboard)** — dashboard of deployed
  container images and Helm charts (Vue 3 + Express 5, Node runtime)

## Prerequisites

- [mise](https://mise.jdx.dev) — installs `node`, `bun` and `pnpm` at the versions
  pinned in `.tool-versions`
- [Docker](https://docker.com) for container builds

```sh
mise install
```

## Working on an app

Everything happens inside the app directory:

```sh
cd apps/<app>

pnpm install
pnpm run typecheck
pnpm run build          # apps that have a build step
pnpm run dev
pnpm run docker:build   # reads .tool-versions for the base image versions
```

The repo root carries only Prettier:

```sh
pnpm install
pnpm run format
```

## Toolchain versions

`.tool-versions` is the single source of truth for `node`, `bun` and `pnpm`.

- CI installs the toolchain with `jdx/mise-action`, which reads the file directly.
- Container images receive the versions as `NODE_VERSION` / `BUN_VERSION` /
  `PNPM_VERSION` build args. The Dockerfiles declare these `ARG`s with **no defaults**,
  so an unset arg fails the build instead of silently drifting from the repo.
- pnpm is installed in the images with `npx get-pnpm ${PNPM_VERSION}`, not with
  Corepack: the `node:26-slim` images no longer ship a `corepack` binary. `SHELL` must
  be set for that command — `get-pnpm` exits 1 if it cannot infer a shell to write its
  rc file into.

## CI

`.github/workflows/ci.yml` is shared by every app and runs three jobs:

1. **`changes`** — diffs against the PR base (or the previous push) and emits a matrix
   of apps whose directory changed. Changes to `.github/workflows/**` or
   `.tool-versions` select every app.
2. **`verify`** — per changed app: `pnpm install --frozen-lockfile`, then
   `pnpm run --if-present typecheck` and `pnpm run --if-present build`.
3. **`build-and-push`** — per changed app: buildx to GHCR. Target platforms come from
   the `docker.platforms` field in that app's `package.json`.

To add an app, create `apps/<app>/` with a `package.json` (including
`docker.platforms`) and a `Dockerfile`. The workflow picks it up with no edits.

## Layout

```
homelab-tools/
├── apps/
│   └── homelab-k8s-dashboard/  # own package.json + pnpm-lock.yaml + Dockerfile
├── .github/workflows/ci.yml   # shared by all apps
├── .tool-versions             # node / bun / pnpm — single source of truth
└── package.json               # repo tooling only (Prettier)
```
