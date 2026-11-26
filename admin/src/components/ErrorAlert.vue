<template>
  <el-alert
    v-if="message"
    class="error-alert"
    type="error"
    show-icon
    :closable="true"
    @close="$emit('clear')"
  >
    <template #title>
      <span v-if="code" class="mono">{{ code }}</span>
      <span class="error-message">{{ displayMessage }}</span>
    </template>
  </el-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { toChineseErrorMessage } from '@/utils/errorMessages';

const props = defineProps<{
  code?: string;
  message?: string;
}>();

const displayMessage = computed(() => toChineseErrorMessage(props.code, props.message));

defineEmits<{
  clear: [];
}>();
</script>

<style scoped>
.error-alert {
  margin-bottom: 12px;
}

.error-message {
  margin-left: 8px;
}
</style>
