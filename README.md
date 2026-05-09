# Homelab Tools

A monorepo of containerized applications and utilities for homelab infrastructure management.

## Getting Started

This workspace uses [Nx](https://nx.dev) for task orchestration, [PNPM workspaces](https://pnpm.io/workspaces) for package management, and [Bun](https://bun.sh) as the JavaScript runtime. A single root `pnpm-lock.yaml` covers all apps; per-app Docker builds isolate dependencies via `pnpm install --filter=<pkg>... --config.node-linker=isolated` followed by `pnpm deploy`.

```sh
# Install all dependencies (workspace-wide)
pnpm install

# Run tasks
pnpm nx run <project>:<target>

# View project graph
pnpm nx graph
```

## Projects

### Apps

- **[api-portal](apps/api-portal)** - OpenAPI / AsyncAPI specification portal
- **[homelab-k8s-dashboard](apps/homelab-k8s-dashboard)** - K8s dashboard showing deployed container images and Helm charts (Vue 3 + Express 5)
- **[kindle-hass-dashboard](apps/kindle-hass-dashboard)** - E-ink Home Assistant dashboard rendered for Kindle, with optional Matter bridge for self-exposure
- **[obsidian-syncer](apps/obsidian-syncer)** - Headless Obsidian vault sync service

## Common Tasks

```sh
# Type check all projects
pnpm nx run-many -t typecheck

# Build container images locally
pnpm nx run <app>:docker:build

# Run all lint checks
pnpm nx run-many -t lint

# Format code
pnpm nx format
```

## CI/CD

The workspace uses GitHub Actions for continuous integration with **Nx affected detection**.

- **CI Pipeline**: `.github/workflows/ci.yml` — runs lint/test/build/typecheck on affected projects, then builds and pushes Docker images for affected apps in the same workflow (gated on CI passing).

### How Affected Detection Works

The workflows use [`nrwl/nx-set-shas`](https://github.com/nrwl/nx-set-shas) to track the last successful build on `main`. This ensures:

- Only changed projects are built and tested
- Efficient CI runs as your monorepo grows
- No unnecessary container image builds

## Development

### Prerequisites

- [PNPM](https://pnpm.io) (for package management)
- [Bun](https://bun.sh) (v1.3+) (as JavaScript runtime)
- [Docker](https://docker.com) (for container builds)

### Project Structure

```
homelab-tools/
├── apps/
│   ├── api-portal/
│   ├── homelab-k8s-dashboard/
│   ├── kindle-hass-dashboard/
│   └── obsidian-syncer/
├── .github/               # CI/CD workflows
├── .husky/                # Pre-commit hooks (prettier + eslint)
├── eslint.config.js       # Root ESLint flat config
├── nx.json                # Nx workspace configuration
├── pnpm-workspace.yaml    # PNPM workspace member globs
├── pnpm-lock.yaml         # Single workspace lockfile
└── package.json           # Root tooling deps
```

## Learn More

- [Nx Documentation](https://nx.dev)
- [Bun Documentation](https://bun.sh/docs)
