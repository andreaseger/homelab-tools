# FluxCD Deployment

This folder contains Kubernetes manifests configured for FluxCD GitOps deployment for homelab use.

## Quick Start

Add the kustomization directly in your FluxCD repository's Kustomization:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: k8s-dashboard
resources:
  - github.com/andreaseger/homelab-tools/apps/homelab-k8s-dashboard/fluxcd
```

Or using a specific branch or tag:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: k8s-dashboard
resources:
  - github.com/andreaseger/homelab-tools/apps/homelab-k8s-dashboard/fluxcd?ref=main
```

Note: the namespace `k8s-dashboard` must already exist (or be created in the parent Kustomization). These manifests do not include a Namespace resource so the same base can be deployed into any namespace via the parent Kustomization's `namespace:` field.

## Directory Structure

```
fluxcd/
├── rbac.yaml            # ServiceAccount, ClusterRole, ClusterRoleBinding
├── deployment.yaml      # Deployment with health checks and Service
├── ingress.yaml         # Ingress with placeholder domain
├── kustomization.yaml   # Base Kustomization
└── README.md            # This file
```

The `kustomization.yaml` adds common labels. This folder can be referenced directly from any Kustomization using the `resources` field.

## Adding Ingress

Ingress is included by default with a placeholder domain (`k8s-dashboard.local`). To customize the domain, create a patch in your FluxCD repository:

```yaml
# clusters/base/k8s-dashboard-patch.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: k8s-dashboard
  namespace: k8s-dashboard
spec:
  tls:
    - hosts:
        - k8s-dashboard.homelab.yourdomain.com
      secretName: k8s-dashboard-tls
  rules:
    - host: k8s-dashboard.homelab.yourdomain.com
```

Then reference this patch in your Kustomization:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: k8s-dashboard
resources:
  - github.com/andreaseger/homelab-tools/apps/homelab-k8s-dashboard/fluxcd
patches:
  - path: ./k8s-dashboard-patch.yaml
```

To disable Ingress entirely, you can use a patch to remove it:

```yaml
# clusters/base/disable-ingress.yaml
$patch: delete
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: k8s-dashboard
  namespace: k8s-dashboard
```

## Overriding ClusterRoleBinding Namespace

If you change the namespace, you need to update the ClusterRoleBinding subject namespace. Use an inline patch:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: my-custom-namespace
resources:
  - github.com/andreaseger/homelab-tools/apps/homelab-k8s-dashboard/fluxcd
patches:
  - target:
      kind: ClusterRoleBinding
      name: k8s-dashboard-reader-binding
    patch: |-
      - op: replace
        path: /subjects/0/namespace
        value: my-custom-namespace
```

## Features

- RBAC with least privileges (pods, FluxCD imagepolicies/helmrepositories/helmcharts)
- Health checks (liveness and readiness probes)
- Resource limits and requests
- Ingress (add cert-manager annotations and TLS via patch — see "Adding Ingress")
- Standard Kubernetes labels (`app.kubernetes.io/*`)

## Updating Image Tag

The `.github/workflows/container-build.yml` workflow at the repo root builds and pushes `ghcr.io/andreaseger/homelab-k8s-dashboard` tagged with `latest`, the commit SHA, and a date-stamped tag whenever an affected app changes on `main`.

To pin a specific tag, patch the `image` field of the Deployment from your parent Kustomization, or use FluxCD's image automation (`ImageRepository` / `ImagePolicy` / `ImageUpdateAutomation`) to track new tags automatically.
