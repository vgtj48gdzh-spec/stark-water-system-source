<template>
  <section>
    <PageHeader title="客户管理" subtitle="客户档案、多地址、脱敏电话和单条 reveal 审计。">
      <el-button type="primary" :icon="Plus" @click="openCreate">新建客户</el-button>
    </PageHeader>
    <ErrorAlert :code="errorCode" :message="errorMessage" @clear="clearError" />

    <div class="filter-row">
      <el-input v-model="filters.keyword" clearable placeholder="客户姓名 / 地址 / 备注" style="width: 210px" @keyup.enter="loadData" />
      <el-input v-model="filters.phone" clearable placeholder="手机号搜索" style="width: 170px" @keyup.enter="loadData" />
      <el-select v-model="filters.regionId" clearable filterable placeholder="区域" style="width: 180px">
        <el-option v-for="item in regions" :key="item.id" :label="item.region_name || item.region_code || item.id" :value="item.id" />
      </el-select>
      <el-select v-model="filters.agentId" clearable filterable placeholder="代理" style="width: 200px">
        <el-option v-for="item in agents" :key="item.id" :label="item.agent_name || item.contact_name || item.id" :value="item.id" />
      </el-select>
      <el-select v-model="filters.servicePointId" clearable filterable placeholder="服务点" style="width: 220px">
        <el-option
          v-for="item in servicePoints"
          :key="item.id"
          :label="item.service_point_name || item.contact_name || item.id"
          :value="item.id"
        />
      </el-select>
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
      <el-table-column prop="customer_name" label="客户" min-width="140" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">{{ customerTypeLabel(row.customer_type) }}</template>
      </el-table-column>
      <el-table-column prop="phone_display" label="手机号" width="150" />
      <el-table-column prop="default_address" label="默认地址" min-width="260" show-overflow-tooltip />
      <el-table-column prop="address_count" label="地址数" width="90" />
      <el-table-column prop="total_delivery_count" label="送水次数" width="100" />
      <el-table-column prop="ticket_balance" label="水票余额" width="110" />
      <el-table-column label="最近下单" width="170">
        <template #default="{ row }">{{ formatTime(row.recent_order_at) }}</template>
      </el-table-column>
      <el-table-column prop="region_name" label="区域" min-width="140" />
      <el-table-column prop="agent_name" label="代理" min-width="160" />
      <el-table-column prop="service_point_name" label="服务点" min-width="170" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ row.status === 'ACTIVE' ? '正常' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="310" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button link type="primary" @click="openAddress(row)">新增地址</el-button>
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="warning" @click="openCustomerReveal(row)">查看完整手机号</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <el-dialog v-model="customerVisible" :title="selectedCustomer ? '编辑客户' : '新建客户'" width="560px">
      <el-alert
        v-if="!selectedCustomer"
        class="form-alert"
        type="info"
        :closable="false"
        show-icon
        title="同一手机号视为同一客户。不同地址、家人联系人或商铺联系人，请进入已有客户详情后新增地址或联系人。"
      />
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="客户姓名">
            <el-input v-model="customerForm.customer_name" placeholder="例如：客户 A" />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="customerForm.phone" :placeholder="selectedCustomer ? '不修改可留空' : '仅本地录入，不写入文档'" />
          </el-form-item>
          <el-form-item label="客户类型">
            <el-select v-model="customerForm.customer_type" style="width: 100%">
              <el-option label="家庭客户" value="HOUSEHOLD" />
              <el-option label="商铺客户" value="SHOP" />
              <el-option label="公司客户" value="COMPANY" />
            </el-select>
          </el-form-item>
          <el-form-item label="来源">
            <el-input v-model="customerForm.source" />
          </el-form-item>
          <el-form-item label="备注" class="full-row">
            <el-input v-model="customerForm.remark" type="textarea" :rows="3" placeholder="可记录客户类型、服务备注，不写真实敏感信息到文档。" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="customerVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitCustomer">保存</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="duplicatePhoneVisible" title="手机号已存在" width="620px">
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        title="该手机号已存在客户，不能重复创建。"
        description="如果是同一手机号下的不同地址 / 家人 / 商铺，请进入已有客户详情后新增地址或联系人。"
      />
      <el-descriptions v-if="duplicateCustomer" class="duplicate-summary" :column="2" border>
        <el-descriptions-item label="已有客户">{{ duplicateCustomer.customer_name || '已有客户' }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ duplicateCustomer.phone_display || '-' }}</el-descriptions-item>
        <el-descriptions-item label="地址数量">{{ duplicateCustomer.address_count ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="最近下单">{{ formatTime(duplicateCustomer.recent_order_at) }}</el-descriptions-item>
        <el-descriptions-item label="默认地址" :span="2">{{ duplicateCustomer.default_address || '未设置' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="duplicatePhoneVisible = false">取消</el-button>
          <el-button type="primary" plain @click="openDuplicateAddress">为该客户新增地址</el-button>
          <el-button type="primary" @click="openDuplicateDetail">查看已有客户</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="addressVisible" :title="selectedAddress ? '编辑地址' : '新增客户地址'" width="660px">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="地址标签">
            <el-select v-model="addressForm.address_label" allow-create filterable style="width: 100%">
              <el-option label="家庭" value="家庭" />
              <el-option label="商铺" value="商铺" />
              <el-option label="公司" value="公司" />
              <el-option label="仓库" value="仓库" />
            </el-select>
          </el-form-item>
          <el-form-item label="联系人">
            <el-input v-model="addressForm.contact_name" />
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="addressForm.contact_phone" placeholder="可留空，默认使用客户手机号" />
          </el-form-item>
          <el-form-item label="区域">
            <el-select v-model="addressForm.region_id" clearable filterable placeholder="选择区域" style="width: 100%">
              <el-option v-for="item in regions" :key="item.id" :label="item.region_name || item.region_code || item.id" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="服务点">
            <el-select v-model="addressForm.service_point_id" clearable filterable placeholder="选择服务点" style="width: 100%">
              <el-option
                v-for="item in servicePoints"
                :key="item.id"
                :label="item.service_point_name || item.contact_name || item.id"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="addressForm.address_status" style="width: 100%">
              <el-option label="可用" value="ACTIVE" />
              <el-option label="停用" value="INACTIVE" />
            </el-select>
          </el-form-item>
          <el-form-item label="设为默认地址" class="full-row">
            <el-switch v-model="addressForm.is_default" />
          </el-form-item>
          <el-form-item label="详细地址" class="full-row">
            <el-input v-model="addressForm.address_line" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="备注" class="full-row">
            <el-input v-model="addressForm.remark" type="textarea" :rows="2" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addressVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitAddress">保存地址</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="revealVisible" :title="revealTarget?.type === 'address' ? '查看地址联系电话' : '查看客户完整手机号'" width="500px">
      <el-alert title="查看完整电话会写入操作审计，请填写原因。" type="warning" :closable="false" show-icon />
      <el-form label-position="top" class="reveal-form">
        <el-form-item label="查看对象">
          <el-input :model-value="revealTarget?.label || '-'" readonly />
        </el-form-item>
        <el-form-item label="查看原因">
          <el-input v-model="revealReason" type="textarea" :rows="3" placeholder="请输入查看原因，例如：试单配送联系客户 / 客服回访 / 售后处理" />
        </el-form-item>
        <el-form-item v-if="revealedPhone" label="完整电话">
          <el-input :model-value="revealedPhone" readonly />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="revealVisible = false">取消</el-button>
          <el-button type="warning" :loading="saving" :disabled="!revealReason" @click="submitReveal">确认查看</el-button>
        </div>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="客户详情" size="72%" @closed="detail = null">
      <div v-if="detail" class="detail-stack">
        <div class="detail-actions">
          <el-button type="primary" @click="openSellTicket(detail)">销售水票</el-button>
          <el-button type="primary" plain @click="openAddress(detail)">新增地址</el-button>
          <el-button type="warning" plain @click="openCustomerReveal(detail)">查看完整手机号</el-button>
        </div>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="客户">{{ detail.customer_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ customerTypeLabel(detail.customer_type) }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detail.phone_display || '-' }}</el-descriptions-item>
          <el-descriptions-item label="区域">{{ detail.region_name || '未分配' }}</el-descriptions-item>
          <el-descriptions-item label="代理">{{ detail.agent_name || '未分配' }}</el-descriptions-item>
          <el-descriptions-item label="服务点">{{ detail.service_point_name || '未分配' }}</el-descriptions-item>
          <el-descriptions-item label="地址数">{{ detail.address_count ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="送水次数">{{ detail.total_delivery_count ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="水票余额">{{ detail.ticket_balance ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="最近下单">{{ formatTime(detail.recent_order_at) }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detail.status === 'ACTIVE' ? '正常' : '停用' }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ detail.remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <section class="detail-section">
          <div class="section-title">
            <span>地址列表</span>
            <el-button size="small" type="primary" @click="openAddress(detail)">新增地址</el-button>
          </div>
          <el-table :data="detail.addresses || []" border size="small">
            <el-table-column prop="address_label" label="标签" width="90" />
            <el-table-column prop="contact_name" label="联系人" width="120" />
            <el-table-column prop="phone_display" label="联系电话" width="150" />
            <el-table-column prop="full_address" label="地址" min-width="260" show-overflow-tooltip />
            <el-table-column prop="region_name" label="区域" width="130" />
            <el-table-column prop="service_point_name" label="服务点" width="160" />
            <el-table-column label="默认" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.is_default" type="success">默认</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">{{ row.address_status === 'INACTIVE' ? '停用' : '可用' }}</template>
            </el-table-column>
            <el-table-column prop="delivery_count" label="送水次数" width="100" />
            <el-table-column label="最近送达" width="170">
              <template #default="{ row }">{{ formatTime(row.latest_delivery_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="260" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openAddress(detail, row)">编辑</el-button>
                <el-button link type="primary" :disabled="row.is_default" @click="setDefaultAddress(row)">设默认</el-button>
                <el-button link type="warning" @click="openAddressReveal(row)">查看电话</el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <section class="detail-section">
          <div class="section-title">最近订单</div>
          <el-table :data="detail.recent_orders || []" border size="small">
            <el-table-column prop="order_status" label="订单状态" width="120" />
            <el-table-column prop="delivery_status" label="配送状态" width="120" />
            <el-table-column prop="payment_status" label="付款状态" width="140" />
            <el-table-column prop="ticket_quantity_to_use" label="用票数" width="90" />
            <el-table-column label="创建时间" width="180">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
          </el-table>
        </section>

        <section class="detail-section">
          <div class="section-title">
            <span>可用水票</span>
            <el-button size="small" type="primary" @click="openSellTicket(detail)">销售水票</el-button>
          </div>
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="客户详情顶部的水票余额只统计已确认并已生效的水票；待确认购买单不会进入可用余额。"
          />
          <el-table :data="availableTickets(detail)" border size="small" empty-text="暂无可用水票">
            <el-table-column prop="ticket_batch_no" label="批次" min-width="160" />
            <el-table-column prop="total_quantity" label="总桶数" width="100" />
            <el-table-column prop="remaining_quantity" label="剩余" width="100" />
            <el-table-column label="购买金额" width="120">
              <template #default="{ row }">{{ money(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="最近确认" width="170">
              <template #default="{ row }">{{ formatTime(row.confirmed_at) }}</template>
            </el-table-column>
          </el-table>
        </section>

        <section class="detail-section">
          <div class="section-title">待确认购买单</div>
          <el-table :data="pendingTicketPurchases(detail)" border size="small" empty-text="暂无待确认水票购买单">
            <el-table-column prop="ticket_package" label="套餐" width="110" />
            <el-table-column prop="total_quantity" label="购买桶数" width="100" />
            <el-table-column label="应收金额" width="120">
              <template #default="{ row }">{{ money(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="付款方式" width="120">
              <template #default="{ row }">{{ ticketPaymentMethodLabel(row.payment_method) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="170">
              <template #default="{ row }">
                {{ paymentStatusLabel(row.payment_status) }} / {{ ticketStatusLabel(row.ticket_status) }}
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="170">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="190" fixed="right">
              <template #default="{ row }">
                <el-button link type="success" @click="openTicketPendingAction(row, 'confirm')">确认收款</el-button>
                <el-button link type="warning" @click="openTicketPendingAction(row, 'cancel')">取消购买单</el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <section class="detail-section">
          <div class="section-title">桶资产</div>
          <el-table :data="detail.barrels || []" border size="small">
            <el-table-column prop="barrel_code" label="桶编号" min-width="160" />
            <el-table-column prop="barrel_status" label="状态" width="150" />
            <el-table-column prop="current_holder_type" label="责任方类型" width="130" />
          </el-table>
        </section>

        <section class="detail-section">
          <div class="section-title">审计日志</div>
          <el-table :data="detail.audit_logs || []" border size="small">
            <el-table-column prop="action" label="动作" min-width="170" />
            <el-table-column prop="actor_role" label="角色" width="130" />
            <el-table-column prop="target_type" label="对象" width="150" />
            <el-table-column prop="reason" label="原因" min-width="220" show-overflow-tooltip />
            <el-table-column label="时间" width="180">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
          </el-table>
        </section>
      </div>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import DataTable from '@/components/DataTable.vue';
import ErrorAlert from '@/components/ErrorAlert.vue';
import PageHeader from '@/components/PageHeader.vue';
import { normalizeApiError } from '@/api/http';
import { waterApi } from '@/api/water';
import type { Agent, Customer, CustomerAddress, CustomerDetail, Region, ServicePoint, Ticket } from '@/api/types';
import { toChineseErrorMessage } from '@/utils/errorMessages';
import { paymentStatusLabel, ticketPaymentMethodLabel, ticketStatusLabel } from '@/utils/statusLabels';

type RevealTarget = {
  type: 'customer' | 'address';
  id: string;
  label: string;
};

const rows = ref<Customer[]>([]);
const router = useRouter();
const regions = ref<Region[]>([]);
const agents = ref<Agent[]>([]);
const servicePoints = ref<ServicePoint[]>([]);
const detail = ref<CustomerDetail | null>(null);
const loading = ref(false);
const saving = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const errorCode = ref('');
const errorMessage = ref('');
const customerVisible = ref(false);
const addressVisible = ref(false);
const detailVisible = ref(false);
const revealVisible = ref(false);
const selectedCustomer = ref<Customer | null>(null);
const selectedAddress = ref<CustomerAddress | null>(null);
const revealTarget = ref<RevealTarget | null>(null);
const revealReason = ref('');
const revealedPhone = ref('');
const duplicatePhoneVisible = ref(false);
const duplicateCustomer = ref<Customer | null>(null);

const filters = reactive({
  keyword: '',
  phone: '',
  regionId: '',
  agentId: '',
  servicePointId: '',
});

const customerForm = reactive({
  customer_name: '',
  phone: '',
  customer_type: 'HOUSEHOLD',
  source: 'admin',
  remark: '',
});

const addressForm = reactive({
  customer_id: '',
  address_label: '家庭',
  contact_name: '',
  contact_phone: '',
  address_line: '',
  region_id: '',
  service_point_id: '',
  is_default: false,
  address_status: 'ACTIVE',
  remark: '',
  reason: '后台维护客户地址',
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

function handleCustomerSaveError(error: unknown) {
  const apiError = normalizeApiError(error);
  if (apiError.code === 'WATER_CUSTOMER_PHONE_EXISTS') {
    duplicateCustomer.value = normalizeDuplicateCustomer(apiError.details?.existing_customer);
    duplicatePhoneVisible.value = true;
    errorCode.value = apiError.code;
    errorMessage.value = '该手机号已存在客户，不能重复创建。请进入已有客户详情后新增地址或联系人。';
    ElMessage.warning(errorMessage.value);
    return;
  }
  errorCode.value = apiError.code;
  errorMessage.value = apiError.message;
  ElMessage.error(toChineseErrorMessage(apiError.code, apiError.message));
}

function normalizeDuplicateCustomer(value: unknown): Customer | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = String(record.id ?? record.customer_id ?? '');
  if (!id) return null;
  return {
    id,
    customer_name: String(record.customer_name ?? '已有客户'),
    phone_display: String(record.phone_display ?? '-'),
    address_count: Number(record.address_count ?? 0),
    recent_order_at: (record.recent_order_at as string | null | undefined) ?? null,
    default_address: String(record.default_address ?? ''),
  };
}

async function loadOptions() {
  const [regionResult, agentResult, servicePointResult] = await Promise.all([
    waterApi.regions.list({ pageSize: 100 }),
    waterApi.agents.list({ pageSize: 100 }),
    waterApi.servicePoints.list({ pageSize: 100 }),
  ]);
  regions.value = regionResult.data;
  agents.value = agentResult.data;
  servicePoints.value = servicePointResult.data;
}

async function loadData() {
  loading.value = true;
  clearError();
  try {
    const result = await waterApi.customers.list({
      page: page.value,
      pageSize: pageSize.value,
      ...filters,
    });
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

function openCreate() {
  selectedCustomer.value = null;
  customerForm.customer_name = '';
  customerForm.phone = '';
  customerForm.customer_type = 'HOUSEHOLD';
  customerForm.source = 'admin';
  customerForm.remark = '';
  customerVisible.value = true;
}

function openEdit(row: Customer) {
  selectedCustomer.value = row;
  customerForm.customer_name = String(row.customer_name ?? '');
  customerForm.phone = '';
  customerForm.customer_type = String(row.customer_type ?? 'HOUSEHOLD');
  customerForm.source = 'admin';
  customerForm.remark = String(row.remark ?? '');
  customerVisible.value = true;
}

function openAddress(customer: Customer, address?: CustomerAddress) {
  selectedCustomer.value = customer;
  selectedAddress.value = address ?? null;
  addressForm.customer_id = customer.id;
  addressForm.address_label = String(address?.address_label ?? '家庭');
  addressForm.contact_name = String(address?.contact_name ?? customer.customer_name ?? '');
  addressForm.contact_phone = '';
  addressForm.address_line = String(address?.address_line ?? '');
  addressForm.region_id = String(address?.region_id ?? customer.region_id ?? '');
  addressForm.service_point_id = String(address?.service_point_id ?? customer.service_point_id ?? '');
  addressForm.is_default = Boolean(address?.is_default ?? false);
  addressForm.address_status = String(address?.address_status ?? 'ACTIVE');
  addressForm.remark = String(address?.remark ?? '');
  addressVisible.value = true;
}

async function openDetail(row: Customer) {
  selectedCustomer.value = row;
  detailVisible.value = true;
  detail.value = null;
  clearError();
  try {
    detail.value = await waterApi.customers.detail(row.id);
  } catch (error) {
    handleError(error);
  }
}

function openCustomerReveal(row: Customer) {
  revealTarget.value = { type: 'customer', id: row.id, label: String(row.customer_name ?? '客户') };
  revealReason.value = '';
  revealedPhone.value = '';
  revealVisible.value = true;
}

function openAddressReveal(row: CustomerAddress) {
  revealTarget.value = {
    type: 'address',
    id: row.id,
    label: `${row.address_label || '地址'}｜${row.contact_name || '-'}｜${row.full_address || row.address_line || '-'}`,
  };
  revealReason.value = '';
  revealedPhone.value = '';
  revealVisible.value = true;
}

async function submitCustomer() {
  saving.value = true;
  clearError();
  try {
    const payload = {
      customer_name: customerForm.customer_name,
      customer_type: customerForm.customer_type,
      phone: customerForm.phone || undefined,
      source: customerForm.source,
      remark: customerForm.remark,
      reason: '后台维护客户档案',
    };
    if (selectedCustomer.value) {
      await waterApi.customers.update(selectedCustomer.value.id, payload);
    } else {
      await waterApi.customers.create(payload);
    }
    ElMessage.success('客户已保存');
    customerVisible.value = false;
    selectedCustomer.value = null;
    await loadData();
  } catch (error) {
    handleCustomerSaveError(error);
  } finally {
    saving.value = false;
  }
}

async function openDuplicateDetail() {
  if (!duplicateCustomer.value) return;
  duplicatePhoneVisible.value = false;
  customerVisible.value = false;
  await openDetail(duplicateCustomer.value);
}

function openDuplicateAddress() {
  if (!duplicateCustomer.value) return;
  duplicatePhoneVisible.value = false;
  customerVisible.value = false;
  openAddress(duplicateCustomer.value);
}

async function submitAddress() {
  saving.value = true;
  clearError();
  try {
    if (selectedAddress.value) {
      await waterApi.customers.updateAddress(selectedAddress.value.id, addressForm);
    } else {
      await waterApi.customers.createAddress(addressForm.customer_id, addressForm);
    }
    ElMessage.success('地址已保存');
    addressVisible.value = false;
    if (selectedCustomer.value) {
      detail.value = await waterApi.customers.detail(selectedCustomer.value.id);
    }
    await loadData();
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

async function setDefaultAddress(row: CustomerAddress) {
  saving.value = true;
  clearError();
  try {
    await waterApi.customers.setDefaultAddress(row.id, '后台设置默认送水地址');
    ElMessage.success('默认地址已更新');
    if (selectedCustomer.value) {
      detail.value = await waterApi.customers.detail(selectedCustomer.value.id);
    }
    await loadData();
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

async function submitReveal() {
  if (!revealTarget.value) return;
  saving.value = true;
  clearError();
  try {
    const result =
      revealTarget.value.type === 'address'
        ? await waterApi.customers.revealAddressPhone(revealTarget.value.id, revealReason.value)
        : await waterApi.customers.revealPhone(revealTarget.value.id, revealReason.value);
    revealedPhone.value = String(result.contact_phone ?? result.phone ?? '');
    ElMessage.success('已记录审计日志');
    if (selectedCustomer.value && detailVisible.value) {
      detail.value = await waterApi.customers.detail(selectedCustomer.value.id);
    }
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

function customerTypeLabel(value?: string) {
  if (value === 'SHOP') return '商铺';
  if (value === 'COMPANY') return '公司';
  return '家庭';
}

function formatTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function money(value: unknown) {
  return `${Number(value ?? 0).toFixed(2)} 元`;
}

function availableTickets(customer: CustomerDetail): Ticket[] {
  return (customer.tickets ?? []).filter((ticket) => {
    return ticket.payment_status === 'CONFIRMED' && ticket.ticket_status === 'ACTIVE' && Number(ticket.remaining_quantity ?? 0) > 0;
  });
}

function pendingTicketPurchases(customer: CustomerDetail): Ticket[] {
  return (customer.tickets ?? []).filter((ticket) => {
    return ticket.payment_status === 'PENDING_CONFIRMATION' || ticket.ticket_status === 'PENDING_EFFECTIVE';
  });
}

function openSellTicket(customer: Customer) {
  sessionStorage.setItem(
    'water.ticketSellCustomer',
    JSON.stringify({
      id: customer.id,
      customer_name: customer.customer_name,
      phone_display: customer.phone_display,
      default_address: customer.default_address,
      ticket_balance: customer.ticket_balance ?? 0,
    }),
  );
  void router.push({ path: '/tickets', query: { sell: '1' } });
}

function openTicketPendingAction(ticket: Ticket, action: 'confirm' | 'cancel') {
  sessionStorage.setItem('water.ticketPendingAction', JSON.stringify({ id: ticket.id, action }));
  void router.push({ path: '/tickets', query: { ticketId: ticket.id, action } });
}

onMounted(async () => {
  try {
    await loadOptions();
  } catch (error) {
    handleError(error);
  }
  await loadData();
});
</script>

<style scoped>
.reveal-form {
  margin-top: 14px;
}

.form-alert,
.duplicate-summary {
  margin-bottom: 16px;
}

.detail-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}
</style>
