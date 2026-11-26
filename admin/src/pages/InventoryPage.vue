<template>
  <section>
    <PageHeader title="库存管理" subtitle="库存余额来自库存流水汇总，不能只改余额。">
      <el-button type="primary" :icon="Plus" @click="movementVisible = true">新增库存流水</el-button>
    </PageHeader>
    <ErrorAlert :code="errorCode" :message="errorMessage" @clear="clearError" />

    <div class="filter-row">
      <el-input v-model="filters.agentId" clearable placeholder="代理筛选（可留空）" style="width: 180px" />
      <el-input v-model="filters.servicePointId" clearable placeholder="服务点筛选（可留空）" style="width: 200px" />
      <el-select v-model="filters.movementType" clearable placeholder="流水类型" style="width: 220px">
        <el-option v-for="item in inventoryMovementTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-button :icon="Search" @click="loadData">查询</el-button>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="库存余额" name="balances">
        <DataTable
          :data="balances"
          :loading="loading"
          :page="page"
          :page-size="pageSize"
          :total="balanceTotal"
          @page-change="setPage"
          @page-size-change="setPageSize"
        >
          <el-table-column prop="agent_name" label="一级代理" min-width="180" />
          <el-table-column prop="service_point_name" label="服务点" min-width="180" />
          <el-table-column prop="sku_name" label="商品" width="160" />
          <el-table-column prop="balance" label="余额桶数" width="120" />
        </DataTable>
      </el-tab-pane>
      <el-tab-pane label="库存流水" name="movements">
        <DataTable
          :data="movements"
          :loading="loading"
          :page="page"
          :page-size="pageSize"
          :total="movementTotal"
          @page-change="setPage"
          @page-size-change="setPageSize"
        >
          <el-table-column label="流水类型" width="210">
            <template #default="{ row }">{{ row.movement_type_label || inventoryMovementTypeLabel(row.movement_type) }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="90" />
          <el-table-column prop="sku_name" label="商品" width="150" />
          <el-table-column label="来源" min-width="190">
            <template #default="{ row }">{{ row.from_party_type_label || '-' }}｜{{ row.from_party_name || '未知对象' }}</template>
          </el-table-column>
          <el-table-column label="去向" min-width="190">
            <template #default="{ row }">{{ row.to_party_type_label || '-' }}｜{{ row.to_party_name || '未知对象' }}</template>
          </el-table-column>
          <el-table-column prop="related_order_code" label="关联订单" min-width="150" />
          <el-table-column prop="operator_name" label="操作人" width="120" />
          <el-table-column prop="reason" label="备注" min-width="180" show-overflow-tooltip />
          <el-table-column prop="created_at" label="时间" width="180" />
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openMovementDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </DataTable>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="movementVisible" title="新增库存流水" width="560px">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="流水类型">
            <el-select v-model="movementForm.movement_type" style="width: 100%">
              <el-option v-for="item in inventoryMovementTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="数量">
            <el-input-number v-model="movementForm.quantity" :min="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="代理 ID">
            <el-input v-model="movementForm.agent_id" />
          </el-form-item>
          <el-form-item label="服务点 ID">
            <el-input v-model="movementForm.service_point_id" />
          </el-form-item>
          <el-form-item label="关联订单 ID">
            <el-input v-model="movementForm.related_order_id" />
          </el-form-item>
          <el-form-item label="原因">
            <el-input v-model="movementForm.reason" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="movementVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitMovement">保存</el-button>
        </div>
      </template>
    </el-dialog>

    <el-drawer v-model="movementDetailVisible" title="库存流水详情" size="620px" @closed="selectedMovement = null">
      <div v-if="selectedMovement" class="detail-stack">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="库存流水用于解释库存为什么增加或减少。真实试单里数量 1 通常代表本次订单配送出库 1 桶。"
        />
        <el-descriptions :column="1" border>
          <el-descriptions-item label="业务摘要">{{ selectedMovement.business_summary || '-' }}</el-descriptions-item>
          <el-descriptions-item label="流水类型">
            {{ selectedMovement.movement_type_label || inventoryMovementTypeLabel(selectedMovement.movement_type) }}
          </el-descriptions-item>
          <el-descriptions-item label="商品">{{ selectedMovement.sku_name || selectedMovement.sku_code || '-' }}</el-descriptions-item>
          <el-descriptions-item label="数量">{{ selectedMovement.quantity_text || `${selectedMovement.quantity ?? '-'} 桶` }}</el-descriptions-item>
          <el-descriptions-item label="来源">
            {{ selectedMovement.from_party_type_label || '-' }}｜{{ selectedMovement.from_party_name || '未知对象' }}
          </el-descriptions-item>
          <el-descriptions-item label="去向">
            {{ selectedMovement.to_party_type_label || '-' }}｜{{ selectedMovement.to_party_name || '未知对象' }}
          </el-descriptions-item>
          <el-descriptions-item label="关联订单">{{ selectedMovement.related_order_summary || '未关联订单' }}</el-descriptions-item>
          <el-descriptions-item label="操作人">{{ selectedMovement.operator_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ selectedMovement.reason || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-collapse>
          <el-collapse-item title="技术信息（内部 ID 和原始 JSON）" name="tech">
            <JsonViewer :value="selectedMovement" />
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import DataTable from '@/components/DataTable.vue';
import ErrorAlert from '@/components/ErrorAlert.vue';
import JsonViewer from '@/components/JsonViewer.vue';
import PageHeader from '@/components/PageHeader.vue';
import { normalizeApiError } from '@/api/http';
import { waterApi } from '@/api/water';
import type { InventoryBalance, InventoryMovement } from '@/api/types';
import { toChineseErrorMessage } from '@/utils/errorMessages';
import { inventoryMovementTypeLabel, inventoryMovementTypeOptions } from '@/utils/statusLabels';

const activeTab = ref('balances');
const balances = ref<InventoryBalance[]>([]);
const movements = ref<InventoryMovement[]>([]);
const loading = ref(false);
const saving = ref(false);
const page = ref(1);
const pageSize = ref(20);
const balanceTotal = ref(0);
const movementTotal = ref(0);
const errorCode = ref('');
const errorMessage = ref('');
const movementVisible = ref(false);
const movementDetailVisible = ref(false);
const selectedMovement = ref<InventoryMovement | null>(null);

const filters = reactive({
  agentId: '',
  servicePointId: '',
  movementType: '',
});

const movementForm = reactive({
  movement_type: 'HQ_TO_AGENT',
  quantity: 1,
  agent_id: '',
  service_point_id: '',
  related_order_id: '',
  reason: 'admin_inventory_movement',
  created_by: 'admin',
  actor_role: 'ADMIN',
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
    if (activeTab.value === 'balances') {
      const result = await waterApi.inventory.balances({
        page: page.value,
        pageSize: pageSize.value,
        agentId: filters.agentId,
        servicePointId: filters.servicePointId,
      });
      balances.value = result.data;
      balanceTotal.value = result.meta.total ?? result.data.length;
    } else {
      const result = await waterApi.inventory.movements({ page: page.value, pageSize: pageSize.value, ...filters });
      movements.value = result.data;
      movementTotal.value = result.meta.total ?? result.data.length;
    }
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

async function submitMovement() {
  saving.value = true;
  clearError();
  try {
    await waterApi.inventory.createMovement(movementForm);
    ElMessage.success('库存流水已创建');
    movementVisible.value = false;
    await loadData();
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

function openMovementDetail(row: InventoryMovement) {
  selectedMovement.value = row;
  movementDetailVisible.value = true;
}

watch(activeTab, () => {
  page.value = 1;
  void loadData();
});

onMounted(loadData);
</script>

<style scoped>
.detail-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
