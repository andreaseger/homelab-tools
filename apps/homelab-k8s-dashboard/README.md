# k8s Dashboard

This project is a web application that displays a dashboard of all deployed container images and their versions in a Kubernetes cluster.

It consists of a Node.js backend using Express.js and a Vue.js frontend.

## Latest versions

For every running container image the dashboard shows the newest available tag
and how many releases the running tag is behind it:

- If a Flux `ImagePolicy` named `<something>-latest` tracks the image, its
  reported latest image wins.
- Otherwise the tag list is read straight from the container registry over the
  anonymous Docker Registry v2 API. Only tags following the same scheme as the
  running one are considered (same `v` prefix, same number of numeric
  components, same variant suffix), so `1.2.3-alpine` is compared against
  `1.4.0-alpine` and never against `2.0.0-rc1`.

Images with a non-numeric tag (`latest`, `stable`), digest-pinned images and
images in registries that need authentication show up as `unknown`.

## Configuration

| Variable              | Default | Description                                            |
| --------------------- | ------- | ------------------------------------------------------ |
| `PORT`                | `8080`  | HTTP port.                                             |
| `EXCLUDED_NAMESPACES` | -       | Comma separated namespaces hidden behind a toggle.     |
| `CACHE_TTL`           | `300`   | Seconds the API responses are cached.                  |
| `REGISTRY_CACHE_TTL`  | `3600`  | Seconds registry tag listings are cached.              |
| `REGISTRY_LOOKUP`     | `true`  | Set to `false` to disable outbound registry lookups.   |
| `REGISTRY_TIMEOUT`    | `8000`  | Timeout in milliseconds for a single registry request. |

## Project Structure

- `src/server/`: The Express.js backend application.
- `src/client/`: The Vue.js frontend application.
- `k8s/`: Kubernetes deployment files.
- `.github/workflows/`: GitHub Actions for CI/CD.
- `Dockerfile`: Dockerfile for building the application container.

## Local Development

To run the application locally, you need to have Node.js and npm installed.

1.  Install dependencies: `npm install`
2.  Run the development server: `npm run dev`

The frontend will be running at `http://127.0.0.1:8080`.

## Docker

### Build the container

To build the Docker container locally, run the following command from the project root:

```bash
docker build -t k8s-dashboard .
```

### Run the container

To run the container locally, you need to provide it with access to your Kubernetes cluster. You can do this by mounting your kubeconfig file.

```bash
docker run -p 8080:80 -v ~/.kube/config:/root/.kube/config k8s-dashboard
```

The application will be available at `http://localhost:8080`.

## Kubernetes Deployment

1.  **Build and Push the Image**: The included GitHub Action will automatically build and push the container image to the GitHub Container Registry.

2.  **Update Deployment YAML**: Open `k8s/deployment.yaml` and replace `ghcr.io/YOUR_USERNAME/YOUR_REPOSITORY:latest` with the path to your container image.

3.  **Apply the YAML**: Use `kubectl` to deploy the application to your cluster:

    ```bash
    kubectl apply -f k8s/deployment.yaml
    ```

4.  **Access the Application**: The service is of type `ClusterIP` by default. To access it, you can use port-forwarding:

    ```bash
    kubectl port-forward svc/k8s-dashboard-service 8080:80
    ```

    The dashboard will then be available at `http://localhost:8080`.
