<template>
  <table>
    <thead>
      <tr>
        <th
          v-for="header in headers"
          :key="header.key"
          @click="sortBy(header.key)"
        >
          {{ header.text }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(item, index) in sortedData" :key="index">
        <td v-for="header in headers" :key="header.key">
          <slot :name="header.key" :item="item">
            {{ item[header.key] }}
          </slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import type { PropType } from 'vue';

interface TableHeader {
  key: string;
  text: string;
}

interface DataItem<T> {
  [key: string]: T;
}

export default defineComponent({
  name: 'DataTable',
  props: {
    headers: {
      type: Array as PropType<TableHeader[]>,
      required: true,
    },
    data: {
      type: Array as PropType<DataItem<string | number | string[] | boolean>[]>,
      required: true,
    },
    defaultSortKey: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const sortKey = ref(props.defaultSortKey);
    const sortOrder = ref<'asc' | 'desc'>('asc');

    const sortBy = (key: string) => {
      if (sortKey.value === key) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey.value = key;
        sortOrder.value = 'asc';
      }
    };

    const sortedData = computed(() => {
      return [...props.data].sort((a, b) => {
        const aValue = a[sortKey.value];
        const bValue = b[sortKey.value];

        const aComparable = Array.isArray(aValue) ? aValue.join(', ') : aValue;
        const bComparable = Array.isArray(bValue) ? bValue.join(', ') : bValue;

        if (aComparable < bComparable) {
          return sortOrder.value === 'asc' ? -1 : 1;
        }
        if (aComparable > bComparable) {
          return sortOrder.value === 'asc' ? 1 : -1;
        }
        return 0;
      });
    });

    return {
      sortBy,
      sortedData,
    };
  },
});
</script>
