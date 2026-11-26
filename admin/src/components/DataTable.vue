<template>
  <div class="table-panel">
    <el-table :data="data" v-loading="loading" border stripe height="560">
      <slot />
    </el-table>
    <div class="table-footer">
      <el-pagination
        layout="total, sizes, prev, pager, next"
        :page-sizes="[10, 20, 50, 100]"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        @update:current-page="$emit('page-change', $event)"
        @update:page-size="$emit('page-size-change', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
defineProps<{
  data: T[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
}>();

defineEmits<{
  'page-change': [value: number];
  'page-size-change': [value: number];
}>();
</script>

<style scoped>
.table-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #edf0f5;
  padding: 10px 12px;
}
</style>
