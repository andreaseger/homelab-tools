# FluxCD Deployment

This folder contains Kubernetes manifests configured for FluxCD GitOps deployment for homelab use.

## Quick Start

Add the kustomization directly in your FluxCD repository's Kustomization:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: k8s-dashboard
resources:
  - github.com/andreaseger/homelab-k8s-dashboard/fluxcd
```

Or using a specific branch or tag:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: k8s-dashboard
resources:
  - github.com/andreaseger/homelab-k8s-dashboard/fluxcd?ref=main
```

## Directory Structure

```
fluxcd/
├── rbac.yaml            # Namespace, ServiceAccount, ClusterRole, ClusterRoleBinding
├── deployment.yaml      # Deployment with health checks and Service
├── ingress.yaml         # Ingress with placeholder domain
├── kustomization.yaml   # Base Kustomization
└── README.md            # This file
```

The `kustomization.yaml` handles image replacement and adds common labels. This folder can be referenced directly from any Kustomization using the `resources` field.

## Adding Ingress

Ingress is included by default with a placeholder domain (`k8s-dashboard.local`). To customize the domain, create a simple patch file in your FluxCD repository:

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
  - github.com/andreaseger/homelab-k8s-dashboard/fluxcd
patchesStrategicMerge:
  - ./k8s-dashboard-patch.yaml
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
  - github.com/andreaseger/homelab-k8s-dashboard/fluxcd
patches:
  - target:
      kind: ClusterRoleBinding
      name: k8s-dashboard
    patch: |-
      - op: replace
        path: /subjects/0/namespace
        value: my-custom-namespace
```

## Features

- ✅ Namespace isolation
- ✅ RBAC with least privileges
- ✅ Health checks (liveness and readiness probes)
- ✅ Resource limits and requests
- ✅ Ingress with TLS support (cert-manager)
- ✅ Standard Kubernetes labels (app.kubernetes.io/\*)

## Updating Image Tag

FluxCD will automatically update the image tag when you push a new image to GitHub Container Registry. The GitHub Action in `.github/workflows/main.yml` will build and push images tagged with both `latest` and the commit SHA.

To use a specific tag, update the `image` field in `deployment.yaml`.
