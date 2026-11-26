<template>
  <div class="page-header">
    <div>
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div class="page-header-actions">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<style scoped>
.page-header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

h1 {
  margin: 0;
  color: #111827;
  font-size: 22px;
  line-height: 1.2;
}

p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
}

.page-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
