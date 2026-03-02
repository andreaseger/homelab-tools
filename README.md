# Homelab Tools

A monorepo of containerized applications and utilities for homelab infrastructure management.

## Getting Started

This workspace uses [Nx](https://nx.dev) for task orchestration and [Bun](https://bun.sh) as the JavaScript runtime.

```sh
# Install dependencies
bun install

# Run tasks
bun nx <target> <project>

# View project graph
bun nx graph
```

## Projects

### Apps

- **[obsidian-syncer](apps/obsidian-syncer)** - Headless Obsidian vault sync service

## Common Tasks

```sh
# Type check all projects
bun nx run-many -t typecheck

# Build container images
bun nx run <app>:container

# Run tests
bun nx run-many -t test

# Lint code
bun nx run-many -t lint
```

## CI/CD

The workspace uses GitHub Actions for continuous integration. Container images are automatically built and pushed to GitHub Container Registry on every push to `main`.

- CI Pipeline: `.github/workflows/ci.yml`
- Container Builds: `.github/workflows/container-build.yml`

## Development

### Prerequisites

- [Bun](https://bun.sh) (v1.3+)
- [Docker](https://docker.com) (for container builds)

### Project Structure

```
homelab-tools/
├── apps/              # Applications
├── packages/          # Shared libraries (future)
├── .github/           # CI/CD workflows
└── nx.json           # Nx workspace configuration
```

## Learn More

- [Nx Documentation](https://nx.dev)
- [Bun Documentation](https://bun.sh/docs)
