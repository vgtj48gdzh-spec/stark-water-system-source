<template>
  <section>
    <PageHeader title="事件队列" subtitle="water_business_events 是未来总公司接入的业务事件 outbox。" />
    <ErrorAlert :code="errorCode" :message="errorMessage" @clear="clearError" />
    <el-alert
      class="event-note"
      type="info"
      show-icon
      :closable="false"
      title="总公司系统尚未接入前，事件状态为“待同步”是正常状态，不代表本地订单、水票、库存或桶资产失败。"
    />

    <div class="filter-row">
      <el-input v-model="filters.eventType" clearable placeholder="事件类型" style="width: 240px" />
      <el-select v-model="filters.syncStatus" clearable placeholder="同步状态" style="width: 160px">
        <el-option v-for="item in syncStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-input v-model="filters.aggregateType" clearable placeholder="聚合类型" style="width: 200px" />
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
      <el-table-column prop="event_type_label" label="业务事件" min-width="210" />
      <el-table-column prop="local_status_label" label="本地状态" width="130" />
      <el-table-column prop="aggregate_summary" label="关联对象" min-width="260" show-overflow-tooltip />
      <el-table-column label="总公司同步" min-width="220">
        <template #default="{ row }">
          <el-tag :type="syncTagType(row.sync_status)" effect="plain">
            {{ row.sync_status_label || syncStatusLabel(row.sync_status) }}
          </el-tag>
          <span class="sync-note">{{ row.sync_status_note }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="sync_attempts" label="重试" width="80" />
      <el-table-column prop="last_sync_error" label="错误原因" min-width="170" show-overflow-tooltip />
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openPayload(row)">查看业务内容</el-button>
          <el-button link type="success" @click="ackEvent(row)">确认同步</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <el-drawer v-model="payloadVisible" title="业务事件详情" size="660px">
      <div v-if="selectedEvent" class="detail-stack">
        <el-alert
          type="info"
          show-icon
          :closable="false"
          :title="selectedEvent.sync_status_note || '待同步是未来总公司接入前的正常状态。'"
        />
        <el-descriptions :column="1" border>
          <el-descriptions-item label="业务事件">{{ selectedEvent.event_type_label || selectedEvent.event_type }}</el-descriptions-item>
          <el-descriptions-item label="本地状态">{{ selectedEvent.local_status_label || '本地已生成' }}</el-descriptions-item>
          <el-descriptions-item label="总公司同步">
            {{ selectedEvent.sync_status_label || syncStatusLabel(selectedEvent.sync_status) }}
          </el-descriptions-item>
          <el-descriptions-item label="关联对象">{{ selectedEvent.aggregate_summary || selectedEvent.related_object_summary || '-' }}</el-descriptions-item>
          <el-descriptions-item label="重试次数">{{ selectedEvent.sync_attempts ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="错误原因">{{ selectedEvent.last_sync_error || '无' }}</el-descriptions-item>
        </el-descriptions>
        <section>
          <h3 class="detail-title">业务摘要</h3>
          <JsonViewer :value="selectedEvent.business_summary || {}" />
        </section>
        <el-collapse>
          <el-collapse-item title="技术信息（event_type / aggregate_id / payload_json）" name="tech">
            <JsonViewer :value="selectedEvent" />
          </el-collapse-item>
        </el-collapse>
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
import type { BusinessEvent } from '@/api/types';
import { toChineseErrorMessage } from '@/utils/errorMessages';
import { syncStatusLabel, syncStatusOptions } from '@/utils/statusLabels';

const rows = ref<BusinessEvent[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const errorCode = ref('');
const errorMessage = ref('');
const payloadVisible = ref(false);
const selectedEvent = ref<BusinessEvent | null>(null);

const filters = reactive({
  eventType: '',
  syncStatus: '',
  aggregateType: '',
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
    const result = await waterApi.events.list({ page: page.value, pageSize: pageSize.value, ...filters });
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

function openPayload(row: BusinessEvent) {
  selectedEvent.value = row;
  payloadVisible.value = true;
}

function syncTagType(value?: string) {
  if (value === 'synced') return 'success';
  if (value === 'failed' || value === 'conflict') return 'danger';
  if (value === 'ignored') return 'info';
  return 'warning';
}

async function ackEvent(row: BusinessEvent) {
  try {
    await waterApi.events.ack(row.event_id || row.id, {
      updated_by: 'admin',
    });
    ElMessage.success('事件已确认同步');
    await loadData();
  } catch (error) {
    handleError(error);
  }
}

onMounted(loadData);
</script>

<style scoped>
.event-note {
  margin-bottom: 14px;
}

.sync-note {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.detail-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-title {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 15px;
}
</style>
