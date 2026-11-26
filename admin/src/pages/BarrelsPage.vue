<template>
  <section>
    <PageHeader title="桶资产管理" subtitle="查看桶当前责任方、状态和流转记录。">
      <el-button type="primary" :icon="Plus" @click="createVisible = true">新增桶资产</el-button>
    </PageHeader>
    <ErrorAlert :code="errorCode" :message="errorMessage" @clear="clearError" />

    <div class="filter-row">
      <el-select v-model="filters.status" clearable placeholder="桶状态" style="width: 190px">
        <el-option v-for="item in barrelStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.currentHolderType" clearable placeholder="责任方类型" style="width: 170px">
        <el-option v-for="item in holderTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-input v-model="filters.currentHolderId" clearable placeholder="责任方 ID" style="width: 190px" />
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
      <el-table-column prop="barrel_code" label="桶编码" width="180" />
      <el-table-column label="状态" width="180">
        <template #default="{ row }">{{ barrelStatusLabel(row.barrel_status) }}</template>
      </el-table-column>
      <el-table-column label="责任方类型" width="150">
        <template #default="{ row }">{{ holderTypeLabel(row.current_holder_type) }}</template>
      </el-table-column>
      <el-table-column prop="current_holder_id" label="责任方 ID" min-width="200" />
      <el-table-column prop="qr_code" label="二维码预留" min-width="160" />
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openMovements(row)">流转记录</el-button>
          <el-button link type="success" @click="openReturn(row)">回收</el-button>
          <el-button link type="warning" @click="openException(row, 'DAMAGED')">损坏</el-button>
          <el-button link type="danger" @click="openException(row, 'LOST')">丢失</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <el-dialog v-model="createVisible" title="新增桶资产" width="540px">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="桶编码">
            <el-input v-model="barrelForm.barrel_code" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="barrelForm.barrel_status" style="width: 100%">
              <el-option v-for="item in barrelStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="责任方类型">
            <el-select v-model="barrelForm.current_holder_type" style="width: 100%">
              <el-option v-for="item in holderTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="责任方 ID">
            <el-input v-model="barrelForm.current_holder_id" />
          </el-form-item>
          <el-form-item label="二维码预留">
            <el-input v-model="barrelForm.qr_code" />
          </el-form-item>
          <el-form-item label="RFID 预留">
            <el-input v-model="barrelForm.rfid_code" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="createVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitCreate">保存</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="returnVisible" title="桶回收" width="520px">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="回收到">
            <el-select v-model="returnForm.to_holder_type" style="width: 100%">
              <el-option v-for="item in holderTypeOptions.filter((option) => option.value !== 'CUSTOMER')" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="回收方 ID">
            <el-input v-model="returnForm.to_holder_id" />
          </el-form-item>
          <el-form-item label="原因" class="full-row">
            <el-input v-model="returnForm.reason" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="returnVisible = false">取消</el-button>
          <el-button type="success" :loading="saving" @click="submitReturn">确认回收</el-button>
        </div>
      </template>
    </el-dialog>

    <el-drawer v-model="movementsVisible" title="桶流转记录" size="560px">
      <el-table :data="movementRows" border stripe>
        <el-table-column prop="movement_type" label="类型" width="150" />
        <el-table-column label="去向" width="140">
          <template #default="{ row }">{{ holderTypeLabel(row.to_holder_type) }}</template>
        </el-table-column>
        <el-table-column prop="to_holder_id" label="去向 ID" min-width="160" />
        <el-table-column prop="reason" label="原因" min-width="160" />
      </el-table>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import DataTable from '@/components/DataTable.vue';
import ErrorAlert from '@/components/ErrorAlert.vue';
import PageHeader from '@/components/PageHeader.vue';
import { normalizeApiError } from '@/api/http';
import { waterApi } from '@/api/water';
import type { Barrel, WaterRecord } from '@/api/types';
import { toChineseErrorMessage } from '@/utils/errorMessages';
import {
  barrelStatusLabel,
  barrelStatusOptions,
  holderTypeLabel,
  holderTypeOptions,
} from '@/utils/statusLabels';

const rows = ref<Barrel[]>([]);
const movementRows = ref<WaterRecord[]>([]);
const loading = ref(false);
const saving = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const errorCode = ref('');
const errorMessage = ref('');
const selectedBarrel = ref<Barrel | null>(null);
const createVisible = ref(false);
const returnVisible = ref(false);
const movementsVisible = ref(false);

const filters = reactive({
  status: '',
  currentHolderType: '',
  currentHolderId: '',
});

const barrelForm = reactive({
  barrel_code: '',
  barrel_status: 'HQ_STOCK',
  current_holder_type: 'HQ',
  current_holder_id: 'hq',
  qr_code: '',
  rfid_code: '',
  created_by: 'admin',
  actor_role: 'ADMIN',
});

const returnForm = reactive({
  to_holder_type: 'SERVICE_POINT',
  to_holder_id: '',
  reason: 'admin_barrel_return',
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
    const result = await waterApi.barrels.list({ page: page.value, pageSize: pageSize.value, ...filters });
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

async function submitCreate() {
  saving.value = true;
  clearError();
  try {
    await waterApi.barrels.create(barrelForm);
    ElMessage.success('桶资产已创建');
    createVisible.value = false;
    await loadData();
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

async function openMovements(row: Barrel) {
  selectedBarrel.value = row;
  try {
    const result = await waterApi.barrels.movements(row.id, { page: 1, pageSize: 100 });
    movementRows.value = result.data;
    movementsVisible.value = true;
  } catch (error) {
    handleError(error);
  }
}

function openReturn(row: Barrel) {
  selectedBarrel.value = row;
  returnForm.to_holder_id = String(row.current_holder_id ?? '');
  returnVisible.value = true;
}

async function submitReturn() {
  if (!selectedBarrel.value) return;
  saving.value = true;
  clearError();
  try {
    await waterApi.barrels.return(selectedBarrel.value.id, returnForm);
    ElMessage.success('桶回收已记录');
    returnVisible.value = false;
    await loadData();
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

async function openException(row: Barrel, status: 'LOST' | 'DAMAGED') {
  saving.value = true;
  clearError();
  try {
    await waterApi.barrels.lostOrDamaged(row.id, {
      status,
      reason: `admin_barrel_${status.toLowerCase()}`,
      created_by: 'admin',
      actor_role: 'ADMIN',
    });
    ElMessage.success('桶状态已更新');
    await loadData();
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

onMounted(loadData);
</script>
