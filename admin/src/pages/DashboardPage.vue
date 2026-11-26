<template>
  <section>
    <PageHeader title="运营首页" subtitle="V0 后台管理总览，数据来自已冻结的水系统 API。">
      <RouterLink to="/trial-wizard">
        <el-button type="primary" plain>进入试单向导</el-button>
      </RouterLink>
    </PageHeader>
    <ErrorAlert :code="errorCode" :message="errorMessage" @clear="clearError" />

    <div class="stat-grid">
      <div v-for="item in stats" :key="item.label" class="stat-card">
        <div class="stat-label">{{ item.label }}</div>
        <div class="stat-value">{{ item.value }}</div>
      </div>
    </div>

    <div class="table-panel">
      <div class="table-title">最近审计日志</div>
      <el-table :data="auditLogs" v-loading="loading" border stripe height="430">
        <el-table-column prop="created_at" label="时间" width="180" />
        <el-table-column label="角色" width="150">
          <template #default="{ row }">{{ roleLabel(row.actor_role) }}</template>
        </el-table-column>
        <el-table-column prop="action" label="动作" width="240" />
        <el-table-column prop="target_type" label="对象类型" width="180" />
        <el-table-column prop="target_id" label="对象 ID" min-width="220" />
        <el-table-column prop="reason" label="原因" min-width="180" />
      </el-table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ErrorAlert from '@/components/ErrorAlert.vue';
import PageHeader from '@/components/PageHeader.vue';
import { normalizeApiError } from '@/api/http';
import { waterApi } from '@/api/water';
import type { AuditLog, Barrel, BusinessEvent, InventoryBalance, Order, Ticket } from '@/api/types';
import { roleLabel } from '@/utils/statusLabels';

const loading = ref(false);
const errorCode = ref('');
const errorMessage = ref('');
const orders = ref<Order[]>([]);
const tickets = ref<Ticket[]>([]);
const inventory = ref<InventoryBalance[]>([]);
const barrels = ref<Barrel[]>([]);
const events = ref<BusinessEvent[]>([]);
const auditLogs = ref<AuditLog[]>([]);

const today = new Date().toISOString().slice(0, 10);

const stats = computed(() => [
  { label: '今日订单数', value: orders.value.filter((item) => String(item.created_at ?? '').startsWith(today)).length },
  {
    label: '今日配送完成',
    value: orders.value.filter(
      (item) => item.order_status === 'DELIVERED' && String(item.updated_at ?? item.created_at ?? '').startsWith(today),
    ).length,
  },
  {
    label: '水票未履约桶数',
    value: tickets.value.reduce((sum, ticket) => sum + Number(ticket.remaining_quantity ?? 0), 0),
  },
  {
    label: '库存总桶数',
    value: inventory.value.reduce((sum, item) => sum + Number(item.balance ?? 0), 0),
  },
  { label: '桶资产数量', value: barrels.value.length },
  { label: '待同步事件数', value: events.value.filter((event) => event.sync_status === 'pending').length },
]);

function clearError() {
  errorCode.value = '';
  errorMessage.value = '';
}

async function loadDashboard() {
  loading.value = true;
  clearError();
  try {
    const [orderPage, ticketPage, inventoryPage, barrelPage, eventPage, auditPage] = await Promise.all([
      waterApi.orders.list({ page: 1, pageSize: 100 }),
      waterApi.tickets.list({ page: 1, pageSize: 100 }),
      waterApi.inventory.balances({ page: 1, pageSize: 100 }),
      waterApi.barrels.list({ page: 1, pageSize: 100 }),
      waterApi.events.list({ page: 1, pageSize: 100 }),
      waterApi.auditLogs.list({ page: 1, pageSize: 10 }),
    ]);
    orders.value = orderPage.data;
    tickets.value = ticketPage.data;
    inventory.value = inventoryPage.data;
    barrels.value = barrelPage.data;
    events.value = eventPage.data;
    auditLogs.value = auditPage.data;
  } catch (error) {
    const apiError = normalizeApiError(error);
    errorCode.value = apiError.code;
    errorMessage.value = apiError.message;
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<style scoped>
.table-title {
  padding: 12px 14px 0;
  color: #334155;
  font-weight: 700;
}
</style>
