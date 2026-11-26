<template>
  <section>
    <PageHeader title="水票管理" subtitle="水票是预付权益：先创建购买单，再确认收款，最后激活可用水票。">
      <el-button type="primary" :icon="Plus" @click="openSell()">销售水票</el-button>
    </PageHeader>
    <ErrorAlert :code="errorCode" :message="errorMessage" @clear="clearError" />

    <el-alert
      class="form-alert"
      type="warning"
      :closable="false"
      show-icon
      title="待确认购买单不会计入客户可用水票余额，必须点击“确认收款”后才会生效。"
      description="如果客户已经有待确认购买单，请优先确认收款或取消原购买单，不要重新创建一张已确认水票。"
    />

    <section v-if="pendingRows.length || pendingLoading" class="pending-ticket-panel">
      <div class="pending-ticket-header">
        <div>
          <h3>待确认购买单</h3>
          <p>这些水票暂未生效，请在这里直接确认收款或取消购买单。</p>
        </div>
        <el-button type="warning" plain :icon="Search" @click="showPendingOnly">只看待确认购买单</el-button>
      </div>
      <el-table :data="pendingRows" border size="small" v-loading="pendingLoading" empty-text="当前没有待确认水票购买单">
        <el-table-column prop="customer_name" label="客户" min-width="130" />
        <el-table-column prop="customer_phone_display" label="手机号" width="140" />
        <el-table-column prop="default_address" label="默认地址" min-width="220" show-overflow-tooltip />
        <el-table-column prop="ticket_package" label="套餐" width="110" />
        <el-table-column prop="total_quantity" label="购买桶数" width="90" />
        <el-table-column label="应收金额" width="110">
          <template #default="{ row }">{{ money(row.amount) }}</template>
        </el-table-column>
        <el-table-column label="付款方式" width="120">
          <template #default="{ row }">{{ ticketPaymentMethodLabel(row.payment_method) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" @click="openConfirm(row)">确认收款</el-button>
            <el-button size="small" type="warning" plain @click="openCancel(row)">取消购买单</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <div class="filter-row">
      <el-select
        v-model="filters.customerId"
        clearable
        filterable
        remote
        reserve-keyword
        :remote-method="searchCustomers"
        :loading="customerSearching"
        placeholder="按手机号 / 姓名搜索客户"
        style="width: 300px"
      >
        <el-option v-for="item in customerOptions" :key="item.id" :label="customerOptionLabel(item)" :value="item.id" />
      </el-select>
      <el-select v-model="filters.paymentStatus" clearable placeholder="付款状态" style="width: 140px">
        <el-option label="待确认" value="PENDING_CONFIRMATION" />
        <el-option label="已确认" value="CONFIRMED" />
        <el-option label="已取消" value="CANCELLED" />
        <el-option label="已退款" value="REFUNDED" />
      </el-select>
      <el-select v-model="filters.ticketStatus" clearable placeholder="水票状态" style="width: 140px">
        <el-option label="待生效" value="PENDING_EFFECTIVE" />
        <el-option label="已生效" value="ACTIVE" />
        <el-option label="已用完" value="USED_UP" />
        <el-option label="已退款" value="REFUNDED" />
        <el-option label="已作废" value="VOIDED" />
      </el-select>
      <el-checkbox v-model="filters.balanceGtZero">只看有余额</el-checkbox>
      <el-button type="warning" plain @click="showPendingOnly">待确认购买单</el-button>
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
      <el-table-column prop="customer_phone_display" label="手机号" width="150" />
      <el-table-column prop="default_address" label="默认地址" min-width="260" show-overflow-tooltip />
      <el-table-column prop="ticket_package" label="水票套餐" width="110" />
      <el-table-column prop="total_quantity" label="购买桶数" width="100" />
      <el-table-column prop="remaining_quantity" label="剩余桶数" width="100" />
      <el-table-column label="应收金额" width="110">
        <template #default="{ row }">{{ money(row.amount) }}</template>
      </el-table-column>
      <el-table-column label="付款方式" width="120">
        <template #default="{ row }">{{ ticketPaymentMethodLabel(row.payment_method) }}</template>
      </el-table-column>
      <el-table-column label="付款状态" width="110">
        <template #default="{ row }">
          <el-tag :type="paymentTagType(row.payment_status)">{{ paymentStatusLabel(row.payment_status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="水票状态" width="110">
        <template #default="{ row }">
          <el-tag :type="ticketTagType(row.ticket_status)">{{ ticketStatusLabel(row.ticket_status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="确认时间" width="170">
        <template #default="{ row }">{{ formatTime(row.confirmed_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.payment_status === 'PENDING_CONFIRMATION'" link type="success" @click="openConfirm(row)">确认收款</el-button>
          <el-button v-if="row.payment_status === 'PENDING_CONFIRMATION'" link type="warning" @click="openCancel(row)">取消购买单</el-button>
          <el-button v-if="canUseTicket(row)" link type="success" @click="openUse(row)">核销</el-button>
          <el-button v-if="canUseTicket(row)" link type="warning" @click="openRefund(row)">退款</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <el-dialog v-model="sellVisible" title="销售水票" width="680px">
      <el-alert
        class="form-alert"
        type="info"
        :closable="false"
        show-icon
        title="水票购买单默认待确认，待确认收款后生效；未确认收款前不会进入可核销余额。"
      />
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="客户搜索：手机号 / 姓名" class="full-row">
            <el-select
              v-model="ticketForm.customer_id"
              filterable
              remote
              reserve-keyword
              :remote-method="searchCustomers"
              :loading="customerSearching"
              placeholder="输入手机号或姓名搜索客户"
              style="width: 100%"
              @change="onSellCustomerChange"
            >
              <el-option v-for="item in customerOptions" :key="item.id" :label="customerOptionLabel(item)" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-alert
            v-if="customerSearchKeyword && !customerSearching && customerOptions.length === 0"
            class="full-row"
            type="warning"
            :closable="false"
            show-icon
            title="该手机号尚未建档，请先新建客户。"
          >
            <template #default>
              <el-button size="small" type="primary" plain @click="goCreateCustomer">去新建客户</el-button>
            </template>
          </el-alert>
          <el-form-item label="选择客户" class="full-row">
            <el-input :model-value="selectedCustomer ? customerOptionLabel(selectedCustomer) : '请先搜索并选择客户'" readonly />
          </el-form-item>
          <el-form-item label="客户当前水票余额">
            <el-input :model-value="`${selectedCustomerBalance} 桶`" readonly />
          </el-form-item>
          <el-form-item label="水票套餐">
            <el-select v-model="ticketForm.package" style="width: 100%" @change="applyPackage">
              <el-option label="10桶票｜95元" value="P10" />
              <el-option label="20桶票｜180元" value="P20" />
              <el-option label="50桶票｜425元" value="P50" />
              <el-option label="自定义" value="CUSTOM" />
            </el-select>
          </el-form-item>
          <el-form-item label="购买桶数">
            <el-input-number v-model="ticketForm.quantity" :min="1" style="width: 100%" @change="syncUnitPrice" />
          </el-form-item>
          <el-form-item label="应收金额">
            <el-input-number v-model="ticketForm.amount" :min="0" :precision="2" style="width: 100%" @change="syncUnitPrice" />
          </el-form-item>
          <el-form-item label="付款方式">
            <el-select v-model="ticketForm.payment_method" style="width: 100%">
              <el-option label="线下微信" value="OFFLINE_WECHAT" />
              <el-option label="线下支付宝" value="OFFLINE_ALIPAY" />
              <el-option label="现金" value="CASH" />
              <el-option label="银行转账" value="BANK_TRANSFER" />
              <el-option label="其他" value="OTHER" />
            </el-select>
          </el-form-item>
          <el-form-item label="付款状态">
            <el-select v-model="ticketForm.payment_status" style="width: 100%">
              <el-option label="待确认：先创建购买单，水票暂不生效" value="PENDING_CONFIRMATION" />
              <el-option label="已确认：本次保存后立即生效" value="CONFIRMED" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注" class="full-row">
            <el-input v-model="ticketForm.reason" type="textarea" :rows="3" placeholder="例如：线下收款待财务确认 / 后台销售20桶水票" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="sellVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" :disabled="!ticketForm.customer_id" @click="submitSell">创建购买单</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="confirmVisible" title="确认收款" width="560px">
      <el-alert type="warning" :closable="false" show-icon title="确认收款后，水票权益会生效并进入可核销余额。" />
      <el-descriptions v-if="selectedTicket" class="dialog-summary" :column="1" border>
        <el-descriptions-item label="客户">{{ selectedTicket.customer_name }}｜{{ selectedTicket.customer_phone_display }}</el-descriptions-item>
        <el-descriptions-item label="购买桶数">{{ selectedTicket.total_quantity ?? 0 }} 桶</el-descriptions-item>
        <el-descriptions-item label="应收金额">{{ money(selectedTicket.amount) }}</el-descriptions-item>
        <el-descriptions-item label="当前付款方式">{{ ticketPaymentMethodLabel(selectedTicket.payment_method) }}</el-descriptions-item>
      </el-descriptions>
      <el-form label-position="top">
        <el-form-item label="付款方式">
          <el-select v-model="confirmForm.payment_method" style="width: 100%">
            <el-option label="线下微信" value="OFFLINE_WECHAT" />
            <el-option label="线下支付宝" value="OFFLINE_ALIPAY" />
            <el-option label="现金" value="CASH" />
            <el-option label="银行转账" value="BANK_TRANSFER" />
            <el-option label="其他" value="OTHER" />
          </el-select>
        </el-form-item>
        <el-form-item label="收款备注">
          <el-input v-model="confirmForm.collection_remark" placeholder="例如：已核对线下微信收款" />
        </el-form-item>
        <el-form-item label="操作原因">
          <el-input v-model="confirmForm.reason" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="confirmVisible = false">取消</el-button>
          <el-button type="success" :loading="saving" :disabled="!confirmForm.reason" @click="submitConfirm">确认收款并激活</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="cancelVisible" title="取消待确认购买单" width="520px">
      <el-alert type="warning" :closable="false" show-icon title="取消后该购买单不会进入可用水票余额，系统会记录操作审计。" />
      <el-descriptions v-if="selectedTicket" class="dialog-summary" :column="1" border>
        <el-descriptions-item label="客户">{{ selectedTicket.customer_name }}｜{{ selectedTicket.customer_phone_display }}</el-descriptions-item>
        <el-descriptions-item label="购买桶数">{{ selectedTicket.total_quantity ?? 0 }} 桶</el-descriptions-item>
        <el-descriptions-item label="应收金额">{{ money(selectedTicket.amount) }}</el-descriptions-item>
      </el-descriptions>
      <el-form label-position="top">
        <el-form-item label="取消原因">
          <el-input v-model="cancelForm.reason" type="textarea" :rows="3" placeholder="例如：客户取消购买 / 重复创建购买单" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelVisible = false">返回</el-button>
          <el-button type="warning" :loading="saving" :disabled="!cancelForm.reason" @click="submitCancel">确认取消购买单</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="actionVisible" :title="dialogTitle" width="560px">
      <el-descriptions v-if="selectedTicket" class="dialog-summary" :column="1" border>
        <el-descriptions-item label="客户">{{ selectedTicket.customer_name }}｜{{ selectedTicket.customer_phone_display }}</el-descriptions-item>
        <el-descriptions-item label="水票">{{ selectedTicket.ticket_package }}｜剩余 {{ selectedTicket.remaining_quantity ?? 0 }} 桶</el-descriptions-item>
      </el-descriptions>
      <el-form label-position="top">
        <el-form-item label="操作桶数">
          <el-input-number v-model="ticketActionForm.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item v-if="mode !== 'refund'" label="关联订单编号（可选）">
          <el-input v-model="ticketActionForm.related_order_id" placeholder="配送核销时可填写订单编号，普通人工核销可留空" />
        </el-form-item>
        <el-form-item label="操作原因">
          <el-input v-model="ticketActionForm.reason" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="actionVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitAction">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import DataTable from '@/components/DataTable.vue';
import ErrorAlert from '@/components/ErrorAlert.vue';
import PageHeader from '@/components/PageHeader.vue';
import { normalizeApiError } from '@/api/http';
import { waterApi } from '@/api/water';
import type { Customer, Ticket } from '@/api/types';
import { toChineseErrorMessage } from '@/utils/errorMessages';
import { paymentStatusLabel, ticketPaymentMethodLabel, ticketStatusLabel } from '@/utils/statusLabels';

type TicketMode = 'use' | 'refund';

const route = useRoute();
const router = useRouter();
const rows = ref<Ticket[]>([]);
const pendingRows = ref<Ticket[]>([]);
const customerOptions = ref<Customer[]>([]);
const selectedCustomer = ref<Customer | null>(null);
const selectedTicket = ref<Ticket | null>(null);
const customerSearching = ref(false);
const loading = ref(false);
const pendingLoading = ref(false);
const saving = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const errorCode = ref('');
const errorMessage = ref('');
const sellVisible = ref(false);
const confirmVisible = ref(false);
const cancelVisible = ref(false);
const actionVisible = ref(false);
const mode = ref<TicketMode>('use');
const customerSearchKeyword = ref('');

const filters = reactive({
  customerId: '',
  paymentStatus: '',
  ticketStatus: '',
  balanceGtZero: false,
});

const ticketForm = reactive({
  customer_id: '',
  package: 'P20',
  quantity: 20,
  amount: 180,
  unit_price: 9,
  payment_method: 'OFFLINE_WECHAT',
  payment_status: 'PENDING_CONFIRMATION',
  reason: '后台创建水票购买单，线下收款待确认',
});

const confirmForm = reactive({
  payment_method: 'OFFLINE_WECHAT',
  collection_remark: '',
  reason: '后台确认水票收款',
});

const cancelForm = reactive({
  reason: '后台取消待确认水票购买单',
});

const ticketActionForm = reactive({
  quantity: 1,
  related_order_id: '',
  reason: '',
});

const selectedCustomerBalance = computed(() => Number(selectedCustomer.value?.ticket_balance ?? 0));

const dialogTitle = computed(() => (mode.value === 'use' ? '核销水票' : '水票退款'));

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

async function searchCustomers(query: string) {
  customerSearchKeyword.value = query;
  customerSearching.value = true;
  try {
    const normalized = query.trim();
    const result = await waterApi.customers.list({
      page: 1,
      pageSize: 20,
      ...(normalized ? (/\d/.test(normalized) ? { phone: normalized } : { keyword: normalized }) : {}),
    });
    customerOptions.value = result.data;
  } catch (error) {
    handleError(error);
  } finally {
    customerSearching.value = false;
  }
}

function customerOptionLabel(customer: Customer) {
  return `${customer.customer_name || '未命名客户'}｜${customer.phone_display || '-'}｜${customer.default_address || '未设置默认地址'}｜当前水票余额 ${customer.ticket_balance ?? 0} 桶`;
}

async function loadData() {
  loading.value = true;
  pendingLoading.value = true;
  clearError();
  try {
    const [result, pendingResult] = await Promise.all([
      waterApi.tickets.list({
        page: page.value,
        pageSize: pageSize.value,
        customerId: filters.customerId,
        paymentStatus: filters.paymentStatus,
        ticketStatus: filters.ticketStatus,
        balanceGtZero: filters.balanceGtZero,
      }),
      waterApi.tickets.list({
        page: 1,
        pageSize: 100,
        paymentStatus: 'PENDING_CONFIRMATION',
      }),
    ]);
    rows.value = result.data;
    pendingRows.value = pendingResult.data;
    total.value = result.meta.total ?? result.data.length;
  } catch (error) {
    handleError(error);
  } finally {
    loading.value = false;
    pendingLoading.value = false;
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

function showPendingOnly() {
  filters.paymentStatus = 'PENDING_CONFIRMATION';
  filters.ticketStatus = 'PENDING_EFFECTIVE';
  filters.balanceGtZero = false;
  page.value = 1;
  void loadData();
}

function openSell(customer?: Customer) {
  selectedCustomer.value = customer ?? null;
  ticketForm.customer_id = customer?.id ?? '';
  ticketForm.package = 'P20';
  ticketForm.quantity = 20;
  ticketForm.amount = 180;
  ticketForm.unit_price = 9;
  ticketForm.payment_method = 'OFFLINE_WECHAT';
  ticketForm.payment_status = 'PENDING_CONFIRMATION';
  ticketForm.reason = '后台创建水票购买单，线下收款待确认';
  if (customer && !customerOptions.value.some((item) => item.id === customer.id)) {
    customerOptions.value = [customer, ...customerOptions.value];
  }
  sellVisible.value = true;
}

function onSellCustomerChange(customerId: string) {
  selectedCustomer.value = customerOptions.value.find((item) => item.id === customerId) ?? null;
}

function applyPackage() {
  if (ticketForm.package === 'P10') {
    ticketForm.quantity = 10;
    ticketForm.amount = 95;
  } else if (ticketForm.package === 'P20') {
    ticketForm.quantity = 20;
    ticketForm.amount = 180;
  } else if (ticketForm.package === 'P50') {
    ticketForm.quantity = 50;
    ticketForm.amount = 425;
  }
  syncUnitPrice();
}

function syncUnitPrice() {
  ticketForm.unit_price = Number((Number(ticketForm.amount || 0) / Math.max(Number(ticketForm.quantity || 1), 1)).toFixed(2));
}

async function submitSell() {
  if (!ticketForm.customer_id) {
    ElMessage.warning('请先搜索并选择客户。');
    return;
  }
  const duplicatePending = await findDuplicatePendingPurchase();
  if (duplicatePending && !(await confirmDuplicatePendingAction(duplicatePending))) {
    return;
  }
  saving.value = true;
  clearError();
  try {
    const result = await waterApi.tickets.sell({
      customer_id: ticketForm.customer_id,
      quantity: ticketForm.quantity,
      unit_price: ticketForm.unit_price,
      amount: ticketForm.amount,
      payment_method: ticketForm.payment_method,
      payment_status: ticketForm.payment_status,
      reason: ticketForm.reason,
    });
    const createdTicket = extractTicket(result);
    if (ticketForm.payment_status === 'CONFIRMED') {
      ElMessage.success('水票购买单已确认收款并生效。');
    } else {
      ElMessage.success('已创建待确认水票购买单，水票暂未生效。');
    }
    sellVisible.value = false;
    await refreshSelectedCustomer();
    await loadData();
    if (ticketForm.payment_status === 'PENDING_CONFIRMATION') {
      await promptPendingPurchaseCreated(createdTicket);
    }
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

function openConfirm(row: Ticket) {
  selectedTicket.value = row;
  confirmForm.payment_method = String(row.payment_method ?? 'OFFLINE_WECHAT');
  confirmForm.collection_remark = '';
  confirmForm.reason = '后台确认水票收款';
  confirmVisible.value = true;
}

async function submitConfirm() {
  if (!selectedTicket.value) return;
  saving.value = true;
  clearError();
  try {
    await waterApi.tickets.confirmPayment(selectedTicket.value.id, confirmForm);
    ElMessage.success('收款已确认，水票已生效。');
    confirmVisible.value = false;
    selectedTicket.value = null;
    await loadData();
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

function openCancel(row: Ticket) {
  selectedTicket.value = row;
  cancelForm.reason = '后台取消待确认水票购买单';
  cancelVisible.value = true;
}

async function submitCancel() {
  if (!selectedTicket.value) return;
  saving.value = true;
  clearError();
  try {
    await waterApi.tickets.cancelPurchase(selectedTicket.value.id, { reason: cancelForm.reason });
    ElMessage.success('购买单已取消。');
    cancelVisible.value = false;
    selectedTicket.value = null;
    await loadData();
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

function openUse(row: Ticket) {
  mode.value = 'use';
  selectedTicket.value = row;
  ticketActionForm.quantity = 1;
  ticketActionForm.related_order_id = '';
  ticketActionForm.reason = '后台人工核销水票';
  actionVisible.value = true;
}

function openRefund(row: Ticket) {
  mode.value = 'refund';
  selectedTicket.value = row;
  ticketActionForm.quantity = 1;
  ticketActionForm.related_order_id = '';
  ticketActionForm.reason = '后台水票退款';
  actionVisible.value = true;
}

async function submitAction() {
  if (!selectedTicket.value) return;
  saving.value = true;
  clearError();
  try {
    const payload = {
      customer_id: selectedTicket.value.customer_id,
      ticket_id: selectedTicket.value.id,
      quantity: ticketActionForm.quantity,
      related_order_id: ticketActionForm.related_order_id || undefined,
      reason: ticketActionForm.reason,
    };
    if (mode.value === 'use') {
      await waterApi.tickets.use(payload);
    } else {
      await waterApi.tickets.refund(payload);
    }
    ElMessage.success(mode.value === 'use' ? '水票已核销。' : '水票退款流水已记录。');
    actionVisible.value = false;
    await loadData();
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

function canUseTicket(row: Ticket) {
  return row.payment_status === 'CONFIRMED' && row.ticket_status === 'ACTIVE' && Number(row.remaining_quantity ?? 0) > 0;
}

function isPendingTicket(row: Ticket) {
  return row.payment_status === 'PENDING_CONFIRMATION' || row.ticket_status === 'PENDING_EFFECTIVE';
}

function paymentTagType(value: unknown) {
  if (value === 'CONFIRMED') return 'success';
  if (value === 'PENDING_CONFIRMATION') return 'warning';
  if (value === 'CANCELLED') return 'info';
  return 'danger';
}

function ticketTagType(value: unknown) {
  if (value === 'ACTIVE') return 'success';
  if (value === 'PENDING_EFFECTIVE') return 'warning';
  if (value === 'VOIDED') return 'info';
  return 'danger';
}

function money(value: unknown) {
  return `${Number(value ?? 0).toFixed(2)} 元`;
}

function formatTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

async function refreshSelectedCustomer() {
  if (!selectedCustomer.value) return;
  try {
    selectedCustomer.value = await waterApi.customers.detail(selectedCustomer.value.id);
  } catch {
    // Customer refresh is best-effort; list refresh will still reflect the ticket state.
  }
}

async function findDuplicatePendingPurchase(): Promise<Ticket | null> {
  if (!ticketForm.customer_id || ticketForm.payment_status !== 'PENDING_CONFIRMATION') return null;
  try {
    const result = await waterApi.tickets.list({
      page: 1,
      pageSize: 100,
      customerId: ticketForm.customer_id,
      paymentStatus: 'PENDING_CONFIRMATION',
    });
    pendingRows.value = mergeTicketsById(pendingRows.value, result.data);
    return (
      result.data.find((ticket) => {
        return (
          isPendingTicket(ticket) &&
          Number(ticket.total_quantity ?? 0) === Number(ticketForm.quantity ?? 0) &&
          Number(ticket.amount ?? 0).toFixed(2) === Number(ticketForm.amount ?? 0).toFixed(2)
        );
      }) ?? null
    );
  } catch {
    return null;
  }
}

async function confirmDuplicatePendingAction(ticket: Ticket): Promise<boolean> {
  try {
    await ElMessageBox.confirm(
      '该客户已有待确认水票购买单，请先确认收款或取消原购买单，避免重复创建。',
      '待确认购买单提醒',
      {
        confirmButtonText: '查看待确认购买单',
        cancelButtonText: '仍然创建',
        distinguishCancelAndClose: true,
        type: 'warning',
      },
    );
    sellVisible.value = false;
    await focusPendingTicket(ticket, 'confirm');
    return false;
  } catch (action) {
    if (action === 'cancel') {
      return true;
    }
    return false;
  }
}

async function promptPendingPurchaseCreated(ticket: Ticket | null) {
  try {
    await ElMessageBox.confirm(
      '已创建待确认水票购买单，水票暂未生效。请在水票管理中点击“确认收款”后生效。',
      '待确认购买单已创建',
      {
        confirmButtonText: '去确认收款',
        cancelButtonText: '继续留在本页',
        type: 'success',
      },
    );
    if (ticket) {
      await focusPendingTicket(ticket, 'confirm');
    } else {
      showPendingOnly();
    }
  } catch {
    // Operator chose to stay on the list; the pending panel is already refreshed.
  }
}

async function focusPendingTicket(ticket: Ticket, action: 'confirm' | 'cancel' = 'confirm') {
  filters.customerId = ticket.customer_id ?? '';
  filters.paymentStatus = 'PENDING_CONFIRMATION';
  filters.ticketStatus = 'PENDING_EFFECTIVE';
  filters.balanceGtZero = false;
  page.value = 1;
  await loadData();
  const freshTicket = findTicketById(ticket.id) ?? ticket;
  if (action === 'cancel') {
    openCancel(freshTicket);
  } else {
    openConfirm(freshTicket);
  }
}

function findTicketById(id?: string) {
  if (!id) return null;
  return [...pendingRows.value, ...rows.value].find((ticket) => ticket.id === id) ?? null;
}

function mergeTicketsById(existing: Ticket[], incoming: Ticket[]) {
  const map = new Map<string, Ticket>();
  for (const ticket of existing) map.set(ticket.id, ticket);
  for (const ticket of incoming) map.set(ticket.id, ticket);
  return Array.from(map.values());
}

function extractTicket(result: Record<string, unknown>): Ticket | null {
  const ticket = result.ticket;
  if (!ticket || typeof ticket !== 'object') return null;
  return ticket as Ticket;
}

function goCreateCustomer() {
  sellVisible.value = false;
  void router.push('/customers');
}

function loadPresetCustomer() {
  if (route.query.sell !== '1') return;
  const raw = sessionStorage.getItem('water.ticketSellCustomer');
  if (!raw) {
    openSell();
    return;
  }
  try {
    const customer = JSON.parse(raw) as Customer;
    openSell(customer);
  } catch {
    openSell();
  } finally {
    sessionStorage.removeItem('water.ticketSellCustomer');
  }
}

async function loadPresetPendingAction() {
  const raw = sessionStorage.getItem('water.ticketPendingAction');
  const queryTicketId = typeof route.query.ticketId === 'string' ? route.query.ticketId : '';
  const queryAction = route.query.action === 'cancel' ? 'cancel' : 'confirm';
  let preset: { id: string; action: 'confirm' | 'cancel' } | null = queryTicketId ? { id: queryTicketId, action: queryAction } : null;
  if (raw) {
    try {
      preset = JSON.parse(raw) as { id: string; action: 'confirm' | 'cancel' };
    } catch {
      preset = null;
    } finally {
      sessionStorage.removeItem('water.ticketPendingAction');
    }
  }
  if (!preset?.id) return;
  filters.paymentStatus = 'PENDING_CONFIRMATION';
  filters.ticketStatus = 'PENDING_EFFECTIVE';
  filters.balanceGtZero = false;
  page.value = 1;
  await loadData();
  const ticket = findTicketById(preset.id);
  if (!ticket) {
    ElMessage.warning('未找到该待确认购买单，可能已经确认或取消。');
    return;
  }
  if (preset.action === 'cancel') {
    openCancel(ticket);
  } else {
    openConfirm(ticket);
  }
}

onMounted(async () => {
  await searchCustomers('');
  await loadData();
  loadPresetCustomer();
  await loadPresetPendingAction();
});
</script>

<style scoped>
.form-alert,
.dialog-summary {
  margin-bottom: 14px;
}

.pending-ticket-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
  padding: 16px;
  border: 1px solid #f3d19e;
  border-radius: 8px;
  background: #fff7ed;
}

.pending-ticket-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pending-ticket-header h3 {
  margin: 0;
  color: #7c2d12;
  font-size: 18px;
}

.pending-ticket-header p {
  margin: 4px 0 0;
  color: #9a3412;
}
</style>
