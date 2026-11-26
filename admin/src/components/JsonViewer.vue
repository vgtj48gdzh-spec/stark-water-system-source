<template>
  <pre class="json-viewer">{{ formatted }}</pre>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  value: unknown;
}>();

const formatted = computed(() => JSON.stringify(props.value ?? null, null, 2));
</script>

<style scoped>
.json-viewer {
  max-height: 420px;
  margin: 0;
  overflow: auto;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #0f172a;
  color: #e5edf7;
  font-size: 12px;
  line-height: 1.55;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
