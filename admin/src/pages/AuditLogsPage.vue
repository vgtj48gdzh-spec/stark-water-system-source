<template>
  <section>
    <PageHeader title="审计日志" subtitle="关键状态变更和敏感操作会写入审计日志。">
      <el-tag type="warning" effect="plain">查看完整手机号必须留痕</el-tag>
    </PageHeader>
    <ErrorAlert :code="errorCode" :message="errorMessage" @clear="clearError" />

    <div class="filter-row">
      <el-select v-model="filters.actorRole" clearable placeholder="角色" style="width: 170px">
        <el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-input v-model="filters.action" clearable placeholder="动作" style="width: 220px" />
      <el-input v-model="filters.targetType" clearable placeholder="对象类型" style="width: 190px" />
      <el-input v-model="filters.targetId" clearable placeholder="对象 ID" style="width: 220px" />
      <el-button :icon="Search" @click="loadData">查询</el-button>
    </div>

    <DataTable
      :data="rows"
      :loading="loading"
      :page="page"
      :page-size="pageSize"
      :total="total"
      @page-change="setPage"
      @page-size-change="setPageSize"
    >
      <el-table-column prop="created_at" label="时间" width="180" />
      <el-table-column label="角色" width="160">
        <template #default="{ row }">{{ roleLabel(row.actor_role) }}</template>
      </el-table-column>
      <el-table-column prop="action" label="动作" min-width="220" />
      <el-table-column prop="target_type" label="对象类型" width="190" />
      <el-table-column prop="target_id" label="对象 ID" min-width="220" />
      <el-table-column prop="reason" label="原因" min-width="160" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openLog(row)">查看</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <el-drawer v-model="drawerVisible" title="审计详情" size="620px">
      <div class="drawer-section">
        <h3>变更前</h3>
        <JsonViewer :value="selectedLog?.before_json" />
      </div>
      <div class="drawer-section">
        <h3>变更后</h3>
        <JsonViewer :value="selectedLog?.after_json" />
      </div>
      <div class="drawer-section">
        <h3>原因</h3>
        <p>{{ selectedLog?.reason || '-' }}</p>
      </div>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import DataTable from '@/components/DataTable.vue';
import ErrorAlert from '@/components/ErrorAlert.vue';
import JsonViewer from '@/components/JsonViewer.vue';
import PageHeader from '@/components/PageHeader.vue';
import { normalizeApiError } from '@/api/http';
import { waterApi } from '@/api/water';
import type { AuditLog } from '@/api/types';
import { toChineseErrorMessage } from '@/utils/errorMessages';
import { roleLabel, roleOptions } from '@/utils/statusLabels';

const rows = ref<AuditLog[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const errorCode = ref('');
const errorMessage = ref('');
const drawerVisible = ref(false);
const selectedLog = ref<AuditLog | null>(null);

const filters = reactive({
  actorRole: '',
  action: '',
  targetType: '',
  targetId: '',
});

function clearError() {
  errorCode.value = '';
  errorMessage.value = '';
}

function handleError(error: unknown) {
  const apiError = normalizeApiError(error);
  errorCode.value = apiError.code;
  errorMessage.value = apiError.message;
  ElMessage.error(toChineseErrorMessage(apiError.code, apiError.message));
}

async function loadData() {
  loading.value = true;
  clearError();
  try {
    const result = await waterApi.auditLogs.list({ page: page.value, pageSize: pageSize.value, ...filters });
    rows.value = result.data;
    total.value = result.meta.total ?? result.data.length;
  } catch (error) {
    handleError(error);
  } finally {
    loading.value = false;
  }
}

function setPage(value: number) {
  page.value = value;
  void loadData();
}

function setPageSize(value: number) {
  pageSize.value = value;
  page.value = 1;
  void loadData();
}

function openLog(row: AuditLog) {
  selectedLog.value = row;
  drawerVisible.value = true;
}

onMounted(loadData);
</script>
