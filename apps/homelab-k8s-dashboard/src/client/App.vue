<template>
  <div>
    <h1>k8s Dashboard</h1>
    <p>Last updated: {{ lastUpdated }}</p>
    <h2>Container Images</h2>
    <DataTable
      :headers="imageHeaders"
      :data="filteredImages"
      default-sort-key="namespaces"
    >
      <template #tag="{ item }">
        <span
          :title="
            item.newer_image_available
              ? `Newer image available: ${item.latest_image}`
              : ''
          "
        >
          {{ item.tag }}
          <span
            v-if="item.newer_image_available"
            class="update-icon"
          >🚀</span>
        </span>
      </template>
      <template #namespaces="{ item }">
        {{ item.namespaces.join(', ') }}
      </template>
      <template #container_names="{ item }">
        {{ item.container_names.join(', ') }}
      </template>
      <template #oldest_pod_age="{ item }">
        {{ formatAge(item.oldest_pod_age) }}
        <span
          v-if="isOld(item.oldest_pod_age)"
          class="age-icon"
        >🕰️</span>
      </template>
      <template #total_restarts="{ item }">
        {{ item.total_restarts }}
        <span
          v-if="hasManyRestarts(item.total_restarts)"
          class="restarts-icon"
        >🔥</span>
      </template>
    </DataTable>
    <div class="controls">
      <button
        v-if="excludedNamespaces.length > 0"
        :title="`Excluded namespaces: ${excludedNamespaces.join(', ')}`"
        @click="toggleShowExcluded"
      >
        {{ showExcluded ? 'Hide' : 'Show' }} excluded namespaces
      </button>
    </div>

    <h2>Helm Charts</h2>
    <DataTable
      :headers="helmHeaders"
      :data="helmCharts"
      default-sort-key="chart"
    >
      <template #repository_url="{ item }">
        <a
          :href="item.repository_url"
          target="_blank"
        >{{
          item.repository_url
        }}</a>
      </template>
    </DataTable>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import DataTable from './components/DataTable.vue';

interface ContainerImage {
  repository: string;
  tag: string;
  namespaces: string[];
  container_names: string[];
  newer_image_available: boolean;
  latest_image: string;
  oldest_pod_age: number;
  total_restarts: number;
}

interface HelmChart {
  name: string;
  chart: string;
  configured_version: string;
  installed_version: string;
  repository_url: string;
}

export default defineComponent({
  name: 'App',
  components: {
    DataTable,
  },
  setup() {
    const images = ref<ContainerImage[]>([]);
    const helmCharts = ref<HelmChart[]>([]);
    const lastUpdated = ref<string>('');
    const excludedNamespaces = ref<string[]>([]);
    const showExcluded = ref(false);

    const imageHeaders = [
      { key: 'repository', text: 'Repository' },
      { key: 'tag', text: 'Tag' },
      { key: 'namespaces', text: 'Namespaces' },
      { key: 'container_names', text: 'Container Names' },
      { key: 'oldest_pod_age', text: 'Oldest Pod Age' },
      { key: 'total_restarts', text: 'Total Restarts' },
    ];

    const helmHeaders = [
      { key: 'name', text: 'Name' },
      { key: 'chart', text: 'Chart' },
      { key: 'configured_version', text: 'Configured Version' },
      { key: 'installed_version', text: 'Installed Version' },
      { key: 'repository_url', text: 'Repository URL' },
    ];

    const fetchImages = async () => {
      const res = await fetch('/api/images');
      const data = await res.json();
      images.value = data.images ?? [];
      lastUpdated.value = data.last_updated
        ? new Date(data.last_updated).toLocaleString()
        : '';
      excludedNamespaces.value = data.excluded_namespaces ?? [];
    };

    const fetchHelmCharts = async () => {
      const res = await fetch('/api/helm-charts');
      const data = await res.json();
      helmCharts.value = data.helm_charts ?? [];
    };

    const toggleShowExcluded = () => {
      showExcluded.value = !showExcluded.value;
    };

    const filteredImages = computed(() => {
      if (showExcluded.value) {
        return images.value;
      }
      return images.value.filter(
        (image) =>
          !image.namespaces.every((ns) =>
            excludedNamespaces.value.includes(ns),
          ),
      );
    });

    const formatAge = (seconds: number) => {
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
      return `${Math.floor(seconds / 86400)}d`;
    };

    const isOld = (seconds: number) => {
      return seconds > 30 * 24 * 3600; // 30 days
    };

    const hasManyRestarts = (restarts: number) => {
      return restarts > 10;
    };

    onMounted(() => {
      fetchImages();
      fetchHelmCharts();
    });

    return {
      images,
      helmCharts,
      lastUpdated,
      showExcluded,
      toggleShowExcluded,
      filteredImages,
      imageHeaders,
      helmHeaders,
      formatAge,
      isOld,
      hasManyRestarts,
      excludedNamespaces,
    };
  },
});
</script>

<style scoped>
.update-icon,
.age-icon,
.restarts-icon {
  margin-left: 0.5rem;
}
.controls {
  margin-top: 1rem;
  text-align: right;
}
h2 {
  margin-top: 2rem;
  color: #93a1a1;
}
a {
  color: #268bd2;
}
button {
  background-color: #073642;
  color: #839496;
  border: 1px solid #586e75;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background-color: #002b36;
}
</style>
