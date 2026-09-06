import express from 'express';
import * as k8s from '@kubernetes/client-node';
import { createCache } from 'cache-manager';

import path from 'path';
import { fileURLToPath } from 'url';

import { getLatestTag } from './registry.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ImagePolicy {
  metadata: {
    name: string;
  };
  status?: {
    /** Removed in newer Flux releases in favour of `latestRef`. */
    latestImage?: string;
    latestRef?: {
      name: string;
      tag: string;
    };
  };
}

interface HelmChartCR {
  metadata: {
    name: string;
  };
  spec: {
    chart: string;
    version: string;
    sourceRef: {
      name: string;
    };
  };
  status?: {
    artifact?: {
      revision: string;
    };
  };
}

interface HelmRepository {
  metadata: {
    name: string;
  };
  spec: {
    url: string;
  };
}

interface ContainerImage {
  repository: string;
  tag: string;
  namespaces: string[];
  container_names: string[];
  newer_image_available: boolean;
  latest_image: string;
  latest_tag: string;
  versions_behind: number | null;
  latest_source: 'imagepolicy' | 'registry' | '';
  oldest_pod_age: number;
  total_restarts: number;
}

/** Runs `worker` over `items`, keeping at most `limit` calls in flight. */
async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, () =>
    (async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        await worker(item);
      }
    })()
  );
  await Promise.all(runners);
}

async function createServer() {
  const app = express();
  const port = parseInt(process.env.PORT || '8080');

  const cache = createCache({
    ttl: parseInt(process.env.CACHE_TTL || '300') * 1000,
  });
  // Registry tag listings change rarely and are the slow part of a refresh, so
  // they get their own, much longer lived cache.
  const registryCache = createCache({
    ttl: parseInt(process.env.REGISTRY_CACHE_TTL || '3600') * 1000,
  });
  const registryLookupEnabled = process.env.REGISTRY_LOOKUP !== 'false';

  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();

  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  const k8sCustomApi = kc.makeApiClient(k8s.CustomObjectsApi);

  /**
   * Remembers which API version actually served a resource, so we pay the
   * fallback probing cost only once per process.
   */
  const servedVersions = new Map<string, string>();

  /**
   * Lists a custom resource, trying each candidate API version in turn. Flux
   * promotes and later removes API versions (HelmChart went v1beta2 -> v1),
   * which otherwise surfaces as a bare 404 from the API server.
   */
  async function listCustomObjects<T>(
    group: string,
    versions: string[],
    namespace: string,
    plural: string
  ): Promise<T[]> {
    const key = `${group}/${plural}`;
    const remembered = servedVersions.get(key);
    const candidates = remembered
      ? [remembered, ...versions.filter((version) => version !== remembered)]
      : versions;

    for (const version of candidates) {
      try {
        const response = (await k8sCustomApi.listNamespacedCustomObject({
          group,
          version,
          namespace,
          plural,
        })) as { items: T[] };
        servedVersions.set(key, version);
        return response.items || [];
      } catch (error) {
        if ((error as { code?: number }).code === 404) {
          continue;
        }
        console.error(`Failed to fetch ${plural}:`, error);
        return [];
      }
    }

    console.error(
      `Failed to fetch ${plural}: none of the API versions ${candidates.join(
        ', '
      )} are served by ${group}`
    );
    return [];
  }

  async function getLatestImages(): Promise<Map<string, string>> {
    const latestImages = new Map<string, string>();
    const imagePolicies = await listCustomObjects<ImagePolicy>(
      'image.toolkit.fluxcd.io',
      ['v1beta2', 'v1', 'v1beta1'],
      'flux-system',
      'imagepolicies'
    );
    for (const policy of imagePolicies) {
      const latestRef = policy.status?.latestRef;
      const latestImage =
        policy.status?.latestImage ??
        (latestRef ? `${latestRef.name}:${latestRef.tag}` : undefined);
      if (policy.metadata.name.endsWith('-latest') && latestImage) {
        const repository = latestImage.split(':')[0];
        latestImages.set(repository, latestImage);
      }
    }
    return latestImages;
  }

  /**
   * Fills in the newest available tag for every image. Flux ImagePolicies are
   * authoritative where they exist; everything else is looked up straight in
   * the container registry so untracked images still show how far behind they
   * are.
   */
  async function addLatestVersions(
    images: ContainerImage[],
    latestImages: Map<string, string>
  ): Promise<void> {
    for (const image of images) {
      const latestImage = latestImages.get(image.repository);
      if (!latestImage) {
        continue;
      }
      image.latest_image = latestImage;
      image.latest_tag = latestImage.split(':').slice(1).join(':');
      image.latest_source = 'imagepolicy';
      image.newer_image_available =
        latestImage !== `${image.repository}:${image.tag}`;
    }

    if (!registryLookupEnabled) {
      return;
    }

    const unresolved = images.filter((image) => !image.latest_source);
    await mapWithConcurrency(unresolved, 5, async (image) => {
      const imageFull = `${image.repository}:${image.tag}`;
      try {
        const cacheKey = `registry:${imageFull}`;
        let latest = await registryCache.get<{
          latest_tag: string;
          versions_behind: number;
        } | null>(cacheKey);
        if (latest === null || latest === undefined) {
          latest = await getLatestTag(imageFull);
          await registryCache.set(cacheKey, latest);
        }
        if (!latest) {
          return;
        }
        image.latest_tag = latest.latest_tag;
        image.latest_image = `${image.repository}:${latest.latest_tag}`;
        image.versions_behind = latest.versions_behind;
        image.latest_source = 'registry';
        image.newer_image_available = latest.latest_tag !== image.tag;
      } catch (error) {
        console.error(`Failed to look up latest tag for ${imageFull}:`, error);
      }
    });
  }

  async function fetchContainerImages() {
    const excludedNamespaces = (process.env.EXCLUDED_NAMESPACES || '')
      .split(',')
      .filter(Boolean);
    const latestImages = await getLatestImages();
    const pods = await k8sApi.listPodForAllNamespaces();
    const imagesMap = new Map<string, ContainerImage>();

    for (const pod of pods.items) {
      if (pod.status?.phase !== 'Running' || !pod.spec || !pod.metadata) {
        continue;
      }

      const podAge = pod.metadata.creationTimestamp
        ? Math.floor(
            (new Date().getTime() -
              new Date(pod.metadata.creationTimestamp).getTime()) /
              1000
          )
        : 0;
      const restartCount = pod.status.containerStatuses
        ? pod.status.containerStatuses.reduce(
            (acc, status) => acc + status.restartCount,
            0
          )
        : 0;

      for (const container of pod.spec.containers) {
        const imageFull = container.image;
        if (!imageFull) {
          continue;
        }
        let repository, tag;
        if (imageFull.includes(':')) {
          [repository, tag] = imageFull.split(':', 2);
        } else {
          repository = imageFull;
          tag = 'latest';
        }
        const imageIdentifier = `${repository}:${tag}`;

        let image = imagesMap.get(imageIdentifier);
        if (!image) {
          image = {
            repository,
            tag,
            namespaces: [],
            container_names: [],
            newer_image_available: false,
            latest_image: '',
            latest_tag: '',
            versions_behind: null,
            latest_source: '',
            oldest_pod_age: podAge,
            total_restarts: restartCount,
          };
          imagesMap.set(imageIdentifier, image);
        } else {
          if (podAge > image.oldest_pod_age) {
            image.oldest_pod_age = podAge;
          }
          image.total_restarts += restartCount;
        }
        if (pod.metadata.namespace) {
          image.namespaces.push(pod.metadata.namespace);
        }
        image.container_names.push(container.name);
      }
    }
    const images = Array.from(imagesMap.values());
    await addLatestVersions(images, latestImages);
    return {
      images,
      last_updated: Date.now(),
      excluded_namespaces: excludedNamespaces,
    };
  }

  async function fetchHelmCharts() {
    const helmRepositoriesMap = new Map();
    const helmRepositories = await listCustomObjects<HelmRepository>(
      'source.toolkit.fluxcd.io',
      ['v1', 'v1beta2'],
      'flux-system',
      'helmrepositories'
    );
    for (const repo of helmRepositories) {
      helmRepositoriesMap.set(repo.metadata.name, repo.spec.url);
    }

    const helmCharts = [];
    const helmChartList = await listCustomObjects<HelmChartCR>(
      'source.toolkit.fluxcd.io',
      ['v1', 'v1beta2'],
      'flux-system',
      'helmcharts'
    );
    for (const chart of helmChartList) {
      helmCharts.push({
        name: chart.metadata.name,
        chart: chart.spec.chart,
        configured_version: chart.spec.version,
        installed_version: chart.status?.artifact?.revision,
        repository_url: helmRepositoriesMap.get(chart.spec.sourceRef.name),
      });
    }
    return { helm_charts: helmCharts, last_updated: Date.now() };
  }

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/api/images', async (req, res) => {
    try {
      const cachedData = await cache.get('images');
      if (cachedData) {
        return res.json(cachedData);
      }
      const data = await fetchContainerImages();
      await cache.set('images', data);
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch container images' });
    }
  });

  app.get('/api/helm-charts', async (req, res) => {
    try {
      const cachedData = await cache.get('helm-charts');
      if (cachedData) {
        return res.json(cachedData);
      }
      const data = await fetchHelmCharts();
      await cache.set('helm-charts', data);
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch helm charts' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, '..', 'client')));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const { default: vue } = await import('@vitejs/plugin-vue');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      root: path.resolve(__dirname, '..', 'client'),
      appType: 'spa',
      plugins: [vue()],
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(
      `Server is running at http://${
        process.env.VITE_HOST || 'localhost'
      }:${port}`
    );
  });
}

createServer();
