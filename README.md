# Homelab Tools

A monorepo of containerized applications and utilities for homelab infrastructure management.

## Getting Started

This workspace uses [Nx](https://nx.dev) for task orchestration and [Bun](https://bun.sh) as the JavaScript runtime. Nx manages the project graph, task dependencies, and caching — there are no npm/bun workspaces. Each app maintains its own `bun.lock` and `node_modules`, keeping dependency trees independent and Docker builds self-contained.

```sh
# Install root tooling (nx, eslint, prettier, husky)
bun install

# Install dependencies for a specific app
cd apps/<app> && bun install

# Run tasks
bun nx run <project>:<target>

# View project graph
bun nx graph
```

## Projects

### Apps

- **[homelab-k8s-dashboard](apps/homelab-k8s-dashboard)** - K8s dashboard showing deployed container images and Helm charts (Vue 3 + Express 5)
- **[obsidian-syncer](apps/obsidian-syncer)** - Headless Obsidian vault sync service

## Common Tasks

```sh
# Type check all projects
bun nx run-many -t typecheck

# Build container images locally
bun nx run <app>:docker:build

# Run all lint checks
bun nx run-many -t lint

# Format code
bun nx format
```

## CI/CD

The workspace uses GitHub Actions for continuous integration with **Nx affected detection**.

- **CI Pipeline**: `.github/workflows/ci.yml` - Runs tests and linting on affected projects
- **Container Builds**: `.github/workflows/container-build.yml` - Builds and pushes only affected Docker images

### How Affected Detection Works

The workflows use [`nrwl/nx-set-shas`](https://github.com/nrwl/nx-set-shas) to track the last successful build on `main`. This ensures:

- Only changed projects are built and tested
- Efficient CI runs as your monorepo grows
- No unnecessary container image builds

## Development

### Prerequisites

- [Bun](https://bun.sh) (v1.3+)
- [Docker](https://docker.com) (for container builds)

### Project Structure

```
homelab-tools/
├── apps/                  # Applications (each with own bun.lock)
│   ├── homelab-k8s-dashboard/
│   └── obsidian-syncer/
├── .github/               # CI/CD workflows
├── .husky/                # Pre-commit hooks (prettier + eslint)
├── eslint.config.js       # Root ESLint flat config
├── nx.json                # Nx workspace configuration
└── package.json           # Root tooling deps (no workspaces)
```

## Learn More

- [Nx Documentation](https://nx.dev)
- [Bun Documentation](https://bun.sh/docs)
