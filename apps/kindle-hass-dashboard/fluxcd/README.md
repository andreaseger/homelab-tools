# Kindle HASS Dashboard - FluxCD Deployment

## Prerequisites

- Home Assistant running on the cluster
- Long-lived access token from HASS profile page
- Kubernetes cluster with FluxCD installed

## Setup

1. Copy `secret.example.yaml` to `secret.yaml` and fill in actual values:

```bash
cp secret.example.yaml secret.yaml
# Edit secret.yaml with real tokens
```

2. The secret should **not** be committed to git. Consider using `sops` or a secrets manager.

3. Add to your FluxCD GitRepository/Kustomization or apply manually:

```bash
kubectl apply -k fluxcd/
```

## Configuration

| Env Var | Description |
|---------|-------------|
| `HASS_URL` | Internal URL to Home Assistant (e.g., `http://home-assistant.home-assistant.svc:8123`) |
| `HASS_TOKEN` | HASS long-lived access token |
| `DASHBOARD_TOKEN` | Bearer token for Kindle daemon auth |
| `PORT` | Server port (default: 8080) |
| `NODE_ENV` | `production` or `development` |
