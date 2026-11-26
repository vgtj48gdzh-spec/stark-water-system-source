<template>
  <section>
    <PageHeader title="订单管理" subtitle="创建、分配、配送完成和取消 V0 水订单。">
      <el-button type="primary" :icon="Plus" @click="openCreateOrder">新建订单</el-button>
    </PageHeader>
    <ErrorAlert :code="errorCode" :message="errorMessage" @clear="clearError" />

    <div class="filter-row">
      <el-select v-model="filters.orderStatus" clearable placeholder="订单状态" style="width: 150px">
        <el-option v-for="item in orderStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.paymentStatus" clearable placeholder="付款状态" style="width: 170px">
        <el-option v-for="item in paymentStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.deliveryStatus" clearable placeholder="配送状态" style="width: 170px">
        <el-option v-for="item in deliveryStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.customerId" clearable filterable placeholder="客户" style="width: 220px">
        <el-option v-for="item in customers" :key="item.id" :label="customerOptionLabel(item)" :value="item.id" />
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
      <el-table-column label="订单编号" min-width="150">
        <template #default="{ row }">{{ shortId(row.id) }}</template>
      </el-table-column>
      <el-table-column prop="customer_name" label="客户" min-width="140" />
      <el-table-column prop="customer_phone_display" label="手机号" width="150" />
      <el-table-column prop="address_summary" label="送水地址" min-width="280" show-overflow-tooltip />
      <el-table-column label="订单状态" width="130">
        <template #default="{ row }">
          <el-tag :type="row.order_status === 'DELIVERED' ? 'success' : row.order_status === 'CANCELLED' ? 'info' : 'warning'">
            {{ orderStatusLabel(row.order_status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="付款状态" width="150">
        <template #default="{ row }">{{ paymentStatusLabel(row.payment_status) }}</template>
      </el-table-column>
      <el-table-column label="配送状态" width="150">
        <template #default="{ row }">{{ deliveryStatusLabel(row.delivery_status) }}</template>
      </el-table-column>
      <el-table-column prop="delivery_quantity" label="本次配送" width="110">
        <template #default="{ row }">{{ row.delivery_quantity ?? 1 }} 桶</template>
      </el-table-column>
      <el-table-column label="结算摘要" min-width="260" show-overflow-tooltip>
        <template #default="{ row }">{{ orderSettlementSummary(row) }}</template>
      </el-table-column>
      <el-table-column prop="service_point_name" label="服务点" min-width="160" />
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openAssign(row)">分配</el-button>
          <el-button link type="success" @click="openDeliver(row)">配送完成</el-button>
          <el-button link type="danger" @click="cancelOrder(row)">取消</el-button>
        </template>
      </el-table-column>
    </DataTable>

    <el-dialog v-model="createVisible" title="新建订单" width="680px">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="客户" class="full-row">
            <el-select
              v-model="orderForm.customer_id"
              filterable
              placeholder="请选择客户"
              style="width: 100%"
              @change="onOrderCustomerChange"
            >
              <el-option v-for="item in customers" :key="item.id" :label="customerOptionLabel(item)" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="送水地址" class="full-row">
            <el-select
              v-model="orderForm.address_id"
              :disabled="!orderForm.customer_id || selectedCustomerAddresses.length === 0"
              filterable
              placeholder="请选择客户地址"
              style="width: 100%"
              @change="onOrderAddressChange"
            >
              <el-option
                v-for="item in selectedCustomerAddresses"
                :key="item.id"
                :label="addressOptionLabel(item)"
                :value="item.id"
              />
            </el-select>
            <div v-if="orderForm.customer_id && selectedCustomerAddresses.length === 0" class="form-hint danger">
              该客户还没有送水地址，请先到客户管理新增地址。
            </div>
          </el-form-item>
          <el-form-item label="本次配送桶数">
            <el-input-number v-model="orderForm.quantity" :min="1" style="width: 100%" @change="syncOrderSettlement" />
            <div class="form-hint">这是客户本次实际要送的水桶数量。</div>
          </el-form-item>
          <el-form-item label="当前水票余额">
            <el-input :model-value="`${currentTicketBalance} 桶`" disabled />
          </el-form-item>
          <el-form-item label="结算方式" class="full-row">
            <el-select v-model="settlementMethod" style="width: 100%" @change="syncOrderSettlement">
              <el-option label="散单现金 / 线下收款" value="CASH" />
              <el-option
                label="全部使用水票"
                value="TICKET"
                :disabled="currentTicketBalance < Math.max(Number(orderForm.quantity ?? 0), 1)"
              />
              <el-option label="水票 + 现金混合支付" value="MIXED" />
            </el-select>
            <div class="form-hint">水票核销数可以少于配送桶数，剩余桶数必须按散单现金 / 线下收款处理。</div>
          </el-form-item>
          <el-form-item label="本单水票核销桶数">
            <el-input :model-value="`${computedTicketQuantity} 桶`" disabled />
          </el-form-item>
          <el-form-item label="本单现金支付桶数">
            <el-input :model-value="`${computedCashQuantity} 桶`" disabled />
          </el-form-item>
          <el-form-item label="本单现金金额">
            <el-input :model-value="`${computedCashAmount.toFixed(2)} 元`" disabled />
          </el-form-item>
          <el-form-item label="服务点">
            <el-input :model-value="selectedServicePointLabel" disabled />
          </el-form-item>
          <el-form-item label="付款状态">
            <el-select v-model="orderForm.payment_status" style="width: 100%">
              <el-option label="未付款" value="UNPAID" />
              <el-option label="待人工确认" value="PENDING_CONFIRMATION" />
              <el-option label="水系统已人工确认" value="CONFIRMED" />
            </el-select>
          </el-form-item>
          <el-form-item class="full-row">
            <el-alert
              :title="settlementHint"
              :type="settlementError ? 'error' : 'info'"
              show-icon
              :closable="false"
            />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="createVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" :disabled="!canSubmitOrder" @click="submitOrder">保存</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="assignVisible" title="分配订单" width="520px">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="代理">
            <el-select v-model="assignForm.agent_id" clearable filterable placeholder="选择代理" style="width: 100%">
              <el-option v-for="item in agents" :key="item.id" :label="item.agent_name || item.contact_name || item.id" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="服务点">
            <el-select v-model="assignForm.service_point_id" clearable filterable placeholder="选择服务点" style="width: 100%">
              <el-option
                v-for="item in servicePoints"
                :key="item.id"
                :label="item.service_point_name || item.contact_name || item.id"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="配送员">
            <el-input v-model="assignForm.delivery_staff_id" placeholder="可填本地配送员代号" />
          </el-form-item>
          <el-form-item label="分配原因">
            <el-input v-model="assignForm.reason" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="assignVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitAssign">保存</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="deliverVisible" title="确认配送完成" width="720px">
      <div v-loading="deliveryContextLoading" class="delivery-dialog">
        <el-descriptions :column="2" border size="small" class="delivery-summary">
          <el-descriptions-item label="订单编号">{{ selectedOrder?.id ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ deliveryCustomerName }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ deliveryCustomerPhone }}</el-descriptions-item>
          <el-descriptions-item label="本次配送桶数">{{ deliveryQuantity }} 桶</el-descriptions-item>
          <el-descriptions-item label="本单水票核销桶数">{{ deliveryTicketQuantity }} 桶</el-descriptions-item>
          <el-descriptions-item label="本单现金支付桶数">{{ deliveryCashQuantity }} 桶</el-descriptions-item>
          <el-descriptions-item label="现金金额">{{ deliveryCashAmount.toFixed(2) }} 元</el-descriptions-item>
          <el-descriptions-item label="付款状态">{{ paymentStatusLabel(selectedOrder?.payment_status) }}</el-descriptions-item>
          <el-descriptions-item label="是否使用水票">{{ deliveryUsesTicket ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="服务点">{{ deliveryServicePointLabel }}</el-descriptions-item>
          <el-descriptions-item label="配送状态">{{ deliveryStatusLabel(selectedOrder?.delivery_status) }}</el-descriptions-item>
        </el-descriptions>

        <el-alert
          v-if="deliveryContextError"
          :title="deliveryContextError"
          type="warning"
          show-icon
          :closable="false"
          class="dialog-alert"
        />
        <el-alert
          v-if="!deliveryUsesTicket"
          title="本单为散单订单，无需核销水票。"
          type="info"
          show-icon
          :closable="false"
          class="dialog-alert"
        />
        <el-alert
          v-else-if="deliveryCashQuantity > 0"
          :title="`本单将核销 ${deliveryTicketQuantity} 桶水票，另有 ${deliveryCashQuantity} 桶按线下收款处理。`"
          type="warning"
          show-icon
          :closable="false"
          class="dialog-alert"
        />
        <el-alert
          v-else-if="availableTickets.length === 0 && !deliveryContextLoading"
          title="该客户没有可用水票，请先销售水票或改为散单订单。"
          type="error"
          show-icon
          :closable="false"
          class="dialog-alert"
        />

        <el-form label-position="top">
          <div class="form-grid">
            <el-form-item v-if="deliveryUsesTicket" label="可用水票" class="full-row">
              <el-select v-model="deliverForm.ticket_id" filterable placeholder="请选择可用水票" style="width: 100%">
                <el-option
                  v-for="ticket in availableTickets"
                  :key="ticket.id"
                  :label="ticketOptionLabel(ticket)"
                  :value="ticket.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item v-if="deliveryUsesTicket" label="核销水票数">
              <el-input-number v-model="deliverForm.ticket_quantity" :min="0" style="width: 100%" />
            </el-form-item>
            <el-form-item label="库存出库桶数">
              <el-input-number v-model="deliverForm.inventory_quantity" :min="0" style="width: 100%" />
              <div class="form-hint">默认按订单数量出库，除异常情况不要修改。</div>
            </el-form-item>
            <el-form-item label="送出水桶" class="full-row">
              <el-select v-model="deliverForm.barrel_id" filterable placeholder="请选择送出水桶" style="width: 100%">
                <el-option
                  v-for="barrel in availableOutboundBarrels"
                  :key="barrel.id"
                  :label="barrelOptionLabel(barrel)"
                  :value="barrel.id"
                />
              </el-select>
              <div class="form-hint">显示桶编号和当前状态，系统内部会提交对应桶资产。</div>
            </el-form-item>
            <el-form-item label="本单有空桶回收" class="full-row">
              <el-switch v-model="hasReturnBarrel" active-text="是" inactive-text="否" />
              <div v-if="!hasReturnBarrel" class="form-hint">默认不登记空桶回收，不需要填写回收桶或回收方。</div>
            </el-form-item>
            <template v-if="hasReturnBarrel">
              <el-form-item label="回收空桶">
                <el-input model-value="暂未绑定具体桶号" disabled />
                <div class="form-hint">如现场未扫码绑定具体空桶，本次只在原因中记录异常说明，不伪造桶资产。</div>
              </el-form-item>
              <el-form-item label="回收到">
                <el-input :model-value="deliveryServicePointLabel" disabled />
              </el-form-item>
              <el-form-item label="回收方">
                <el-input :model-value="returnHolderLabel" disabled />
              </el-form-item>
            </template>
            <el-form-item label="操作原因" class="full-row">
              <el-input v-model="deliverForm.reason" />
            </el-form-item>
          </div>
        </el-form>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="deliverVisible = false">取消</el-button>
          <el-button type="success" :loading="saving" :disabled="!canSubmitDeliver" @click="submitDeliver">确认配送完成</el-button>
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import DataTable from '@/components/DataTable.vue';
import ErrorAlert from '@/components/ErrorAlert.vue';
import PageHeader from '@/components/PageHeader.vue';
import { normalizeApiError } from '@/api/http';
import { waterApi } from '@/api/water';
import type { Agent, Barrel, Customer, CustomerAddress, Order, ServicePoint, Ticket } from '@/api/types';
import { toChineseErrorMessage } from '@/utils/errorMessages';
import {
  barrelStatusLabel,
  deliveryStatusLabel,
  deliveryStatusOptions,
  orderStatusLabel,
  orderStatusOptions,
  paymentStatusLabel,
  paymentStatusOptions,
} from '@/utils/statusLabels';

const rows = ref<Order[]>([]);
const customers = ref<Customer[]>([]);
const agents = ref<Agent[]>([]);
const servicePoints = ref<ServicePoint[]>([]);
const selectedCustomerAddresses = ref<CustomerAddress[]>([]);
const loading = ref(false);
const saving = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const errorCode = ref('');
const errorMessage = ref('');
const selectedOrder = ref<Order | null>(null);
const selectedOrderCustomer = ref<Customer | null>(null);
const selectedOrderAddress = ref<CustomerAddress | null>(null);
const createVisible = ref(false);
const assignVisible = ref(false);
const deliverVisible = ref(false);
const deliveryContextLoading = ref(false);
const deliveryContextError = ref('');
const deliveryCustomer = ref<Customer | null>(null);
const availableTickets = ref<Ticket[]>([]);
const availableOutboundBarrels = ref<Barrel[]>([]);
const hasReturnBarrel = ref(false);
const settlementMethod = ref<'CASH' | 'TICKET' | 'MIXED'>('CASH');
const singleBarrelPrice = 10;

const filters = reactive({
  orderStatus: '',
  paymentStatus: '',
  deliveryStatus: '',
  customerId: '',
  servicePointId: '',
});

const orderForm = reactive({
  customer_id: '',
  address_id: '',
  quantity: 1,
  ticket_quantity_to_use: 1,
  barrel_quantity_to_return: 0,
  total_amount: 10,
  payment_status: 'PENDING_CONFIRMATION',
  agent_id: '',
  service_point_id: '',
  created_by: 'admin',
  actor_role: 'ADMIN',
});

const assignForm = reactive({
  agent_id: '',
  service_point_id: '',
  delivery_staff_id: '',
  updated_by: 'admin',
  actor_role: 'ADMIN',
  reason: '后台分配订单',
});

const deliverForm = reactive({
  ticket_id: '',
  ticket_quantity: 1,
  inventory_quantity: 1,
  barrel_id: '',
  return_to_holder_type: 'SERVICE_POINT',
  return_to_holder_id: '',
  updated_by: 'admin',
  actor_role: 'ADMIN',
  reason: '后台确认配送完成',
});

const selectedServicePointLabel = computed(() => {
  const point = servicePoints.value.find((item) => item.id === orderForm.service_point_id);
  return point?.service_point_name || selectedOrderAddress.value?.service_point_name || '未分配';
});

const currentTicketBalance = computed(() => Number(selectedOrderCustomer.value?.ticket_balance ?? 0));

const computedTicketQuantity = computed(() => {
  const deliveryQuantity = Math.max(Number(orderForm.quantity ?? 0), 1);
  if (settlementMethod.value === 'CASH') return 0;
  if (settlementMethod.value === 'TICKET') return deliveryQuantity;
  return Math.min(currentTicketBalance.value, deliveryQuantity);
});

const computedCashQuantity = computed(() => {
  const deliveryQuantity = Math.max(Number(orderForm.quantity ?? 0), 1);
  return Math.max(deliveryQuantity - computedTicketQuantity.value, 0);
});

const computedCashAmount = computed(() => computedCashQuantity.value * singleBarrelPrice);

const settlementError = computed(() => {
  const deliveryQuantity = Math.max(Number(orderForm.quantity ?? 0), 1);
  return settlementMethod.value === 'TICKET' && currentTicketBalance.value < deliveryQuantity;
});

const settlementHint = computed(() => {
  const deliveryQuantity = Math.max(Number(orderForm.quantity ?? 0), 1);
  if (!orderForm.customer_id) return '请选择客户后，系统会显示当前水票余额并计算本单结算方式。';
  if (currentTicketBalance.value === 0 && settlementMethod.value !== 'CASH') {
    return '当前客户暂无可用水票，可创建散单订单，或先销售水票。';
  }
  if (settlementError.value) {
    return '客户水票余额不足，无法全部使用水票。可选择“水票 + 现金混合支付”。';
  }
  if (settlementMethod.value === 'CASH') {
    return '本单为散单订单，不核销水票。';
  }
  if (settlementMethod.value === 'TICKET') {
    return '客户水票余额充足，可全部使用水票。';
  }
  if (currentTicketBalance.value < deliveryQuantity) {
    return `客户水票余额不足，本单将核销 ${computedTicketQuantity.value} 桶水票，剩余 ${computedCashQuantity.value} 桶按散单收款。`;
  }
  return `本单将核销 ${computedTicketQuantity.value} 桶水票，剩余 ${computedCashQuantity.value} 桶按散单收款。`;
});

const canSubmitOrder = computed(
  () => Boolean(orderForm.customer_id && orderForm.address_id && orderForm.quantity > 0 && !saving.value) && !settlementError.value,
);

const deliveryUsesTicket = computed(() => Number(selectedOrder.value?.ticket_quantity_to_use ?? 0) > 0);

const deliveryQuantity = computed(() => {
  const rowQuantity = Number(selectedOrder.value?.delivery_quantity ?? 0);
  const ticketQuantity = Number(selectedOrder.value?.ticket_quantity_to_use ?? 0);
  const inventoryQuantity = Number(deliverForm.inventory_quantity ?? 0);
  return Math.max(rowQuantity || ticketQuantity || inventoryQuantity || 1, 1);
});

const deliveryTicketQuantity = computed(() => Number(selectedOrder.value?.ticket_quantity_to_use ?? 0));

const deliveryCashQuantity = computed(() => {
  const rowCashQuantity = selectedOrder.value?.cash_quantity;
  if (rowCashQuantity !== undefined && rowCashQuantity !== null) return Math.max(Number(rowCashQuantity), 0);
  return Math.max(deliveryQuantity.value - deliveryTicketQuantity.value, 0);
});

const deliveryCashAmount = computed(() => {
  const rowCashAmount = selectedOrder.value?.cash_amount ?? selectedOrder.value?.total_amount;
  if (rowCashAmount !== undefined && rowCashAmount !== null) return Math.max(Number(rowCashAmount), 0);
  return deliveryCashQuantity.value * singleBarrelPrice;
});

const deliveryCustomerName = computed(() => {
  return String(deliveryCustomer.value?.customer_name ?? selectedOrder.value?.customer_name ?? '-');
});

const deliveryCustomerPhone = computed(() => {
  return String(deliveryCustomer.value?.phone_display ?? selectedOrder.value?.customer_phone_display ?? '-');
});

const deliveryServicePointLabel = computed(() => {
  if (selectedOrder.value?.service_point_name) return String(selectedOrder.value.service_point_name);
  if (selectedOrder.value?.service_point_id) {
    const point = servicePoints.value.find((item) => item.id === selectedOrder.value?.service_point_id);
    return point?.service_point_name || '当前订单服务点';
  }
  if (selectedOrder.value?.agent_name) return String(selectedOrder.value.agent_name);
  return '未分配服务点';
});

const returnHolderLabel = computed(() => {
  if (selectedOrder.value?.service_point_id) return deliveryServicePointLabel.value;
  return '当前登录用户';
});

const canSubmitDeliver = computed(() => {
  if (!selectedOrder.value || saving.value || deliveryContextLoading.value) return false;
  if (deliveryUsesTicket.value && !deliverForm.ticket_id) return false;
  if (deliveryUsesTicket.value && availableTickets.value.length === 0) return false;
  return Boolean(deliverForm.barrel_id);
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

async function loadOptions() {
  const [customerResult, agentResult, servicePointResult] = await Promise.all([
    waterApi.customers.list({ pageSize: 100 }),
    waterApi.agents.list({ pageSize: 100 }),
    waterApi.servicePoints.list({ pageSize: 100 }),
  ]);
  customers.value = customerResult.data;
  agents.value = agentResult.data;
  servicePoints.value = servicePointResult.data;
}

async function loadData() {
  loading.value = true;
  clearError();
  try {
    const result = await waterApi.orders.list({ page: page.value, pageSize: pageSize.value, ...filters });
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

function openCreateOrder() {
  orderForm.customer_id = '';
  orderForm.address_id = '';
  orderForm.quantity = 1;
  orderForm.ticket_quantity_to_use = 0;
  orderForm.barrel_quantity_to_return = 1;
  orderForm.total_amount = 10;
  orderForm.payment_status = 'PENDING_CONFIRMATION';
  orderForm.agent_id = '';
  orderForm.service_point_id = '';
  selectedOrderCustomer.value = null;
  selectedOrderAddress.value = null;
  selectedCustomerAddresses.value = [];
  settlementMethod.value = 'CASH';
  syncOrderSettlement();
  createVisible.value = true;
}

async function onOrderCustomerChange(customerId: string) {
  selectedOrderCustomer.value = customers.value.find((item) => item.id === customerId) ?? null;
  selectedOrderAddress.value = null;
  orderForm.address_id = '';
  orderForm.agent_id = String(selectedOrderCustomer.value?.agent_id ?? '');
  orderForm.service_point_id = String(selectedOrderCustomer.value?.service_point_id ?? '');
  selectedCustomerAddresses.value = customerId ? await waterApi.customers.addresses(customerId) : [];
  const defaultAddress =
    selectedCustomerAddresses.value.find((address) => address.is_default && address.address_status !== 'INACTIVE') ??
    selectedCustomerAddresses.value.find((address) => address.address_status !== 'INACTIVE') ??
    null;
  if (defaultAddress) {
    orderForm.address_id = defaultAddress.id;
    onOrderAddressChange(defaultAddress.id);
  }
  settlementMethod.value = currentTicketBalance.value > 0 ? 'TICKET' : 'CASH';
  syncOrderSettlement();
}

function onOrderAddressChange(addressId: string) {
  selectedOrderAddress.value = selectedCustomerAddresses.value.find((address) => address.id === addressId) ?? null;
  if (selectedOrderAddress.value?.service_point_id) {
    orderForm.service_point_id = String(selectedOrderAddress.value.service_point_id);
  }
}

function syncOrderSettlement() {
  const deliveryQuantity = Math.max(Number(orderForm.quantity ?? 0), 1);
  orderForm.quantity = deliveryQuantity;
  orderForm.ticket_quantity_to_use = computedTicketQuantity.value;
  orderForm.barrel_quantity_to_return = deliveryQuantity;
  orderForm.total_amount = computedCashAmount.value;
}

async function submitOrder() {
  if (!orderForm.address_id) {
    ElMessage.error('请先选择客户地址');
    return;
  }
  syncOrderSettlement();
  if (settlementError.value) {
    ElMessage.error('客户水票余额不足，无法全部使用水票。可选择“水票 + 现金混合支付”。');
    return;
  }
  saving.value = true;
  clearError();
  try {
    await waterApi.orders.create({
      customer_id: orderForm.customer_id,
      address_id: orderForm.address_id,
      quantity: orderForm.quantity,
      ticket_quantity_to_use: computedTicketQuantity.value,
      barrel_quantity_to_return: orderForm.quantity,
      total_amount: orderForm.total_amount,
      payment_status: orderForm.payment_status,
      agent_id: orderForm.agent_id || undefined,
      service_point_id: orderForm.service_point_id || undefined,
      created_by: orderForm.created_by,
      actor_role: orderForm.actor_role,
    });
    ElMessage.success('订单已创建');
    createVisible.value = false;
    await loadData();
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

function openAssign(row: Order) {
  selectedOrder.value = row;
  assignForm.agent_id = String(row.agent_id ?? '');
  assignForm.service_point_id = String(row.service_point_id ?? '');
  assignForm.delivery_staff_id = '';
  assignForm.reason = '后台分配订单';
  assignVisible.value = true;
}

async function submitAssign() {
  if (!selectedOrder.value) return;
  saving.value = true;
  clearError();
  try {
    await waterApi.orders.assign(selectedOrder.value.id, assignForm);
    ElMessage.success('订单已分配');
    assignVisible.value = false;
    await loadData();
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

function ticketBalance(ticket: Ticket): number {
  return Number(ticket.remaining_quantity ?? ticket.balance ?? 0);
}

function orderDeliveryQuantity(order: Order): number {
  return Math.max(Number(order.delivery_quantity ?? order.barrel_quantity_to_return ?? order.ticket_quantity_to_use ?? 1), 1);
}

function orderTicketQuantity(order: Order): number {
  return Math.max(Number(order.ticket_quantity_to_use ?? 0), 0);
}

function orderCashQuantity(order: Order): number {
  if (order.cash_quantity !== undefined && order.cash_quantity !== null) return Math.max(Number(order.cash_quantity), 0);
  return Math.max(orderDeliveryQuantity(order) - orderTicketQuantity(order), 0);
}

function orderCashAmount(order: Order): number {
  const cashAmount = order.cash_amount ?? order.total_amount;
  if (cashAmount !== undefined && cashAmount !== null) return Math.max(Number(cashAmount), 0);
  return orderCashQuantity(order) * singleBarrelPrice;
}

function orderSettlementSummary(order: Order): string {
  if (order.settlement_summary) return String(order.settlement_summary);
  const deliveryQuantity = orderDeliveryQuantity(order);
  const ticketQuantity = orderTicketQuantity(order);
  const cashQuantity = orderCashQuantity(order);
  const cashAmount = orderCashAmount(order);
  if (ticketQuantity <= 0) return `配送 ${deliveryQuantity} 桶｜散单现金 ${cashAmount.toFixed(2)} 元`;
  if (cashQuantity <= 0) return `配送 ${deliveryQuantity} 桶｜全部水票核销 ${ticketQuantity} 桶`;
  return `配送 ${deliveryQuantity} 桶｜水票 ${ticketQuantity} 桶｜现金 ${cashQuantity} 桶｜现金金额 ${cashAmount.toFixed(2)} 元`;
}

function ticketOptionLabel(ticket: Ticket): string {
  const total = Number(ticket.total_quantity ?? ticketBalance(ticket) ?? 0);
  const balance = ticketBalance(ticket);
  const unitPrice = Number(ticket.unit_price ?? 0);
  const amount = unitPrice > 0 && total > 0 ? `｜购买金额 ${(unitPrice * total).toFixed(2)} 元` : '';
  const batch = ticket.ticket_batch_no ? `${ticket.ticket_batch_no}｜` : '';
  return `${batch}${total || balance}桶票｜剩余 ${balance} 桶${amount}｜客户：${deliveryCustomerName.value}`;
}

function barrelOptionLabel(barrel: Barrel): string {
  return `${barrel.barrel_code ?? '未编号水桶'}｜${barrelStatusLabel(barrel.barrel_status)}`;
}

async function openDeliver(row: Order) {
  selectedOrder.value = row;
  deliveryContextLoading.value = true;
  deliveryContextError.value = '';
  deliveryCustomer.value = null;
  availableTickets.value = [];
  availableOutboundBarrels.value = [];
  hasReturnBarrel.value = false;
  deliverForm.ticket_id = '';
  deliverForm.ticket_quantity = Number(row.ticket_quantity_to_use ?? 0);
  deliverForm.inventory_quantity = Math.max(Number(row.delivery_quantity ?? row.ticket_quantity_to_use ?? 0) || 1, 1);
  deliverForm.barrel_id = '';
  deliverForm.return_to_holder_type = 'SERVICE_POINT';
  deliverForm.return_to_holder_id = String(row.service_point_id ?? row.agent_id ?? '');
  deliverForm.reason = '后台确认配送完成';
  deliverVisible.value = true;
  try {
    const [customerResult, tickets, barrels] = await Promise.all([
      row.customer_id ? waterApi.customers.get(String(row.customer_id)) : Promise.resolve(null),
      deliveryUsesTicket.value
        ? waterApi.tickets.list({
            customerId: String(row.customer_id ?? ''),
            balanceGtZero: true,
            pageSize: 50,
          })
        : Promise.resolve({ data: [], meta: { requestId: '', timestamp: '' } }),
      waterApi.barrels.list({
        currentHolderType: 'SERVICE_POINT',
        currentHolderId: String(row.service_point_id ?? ''),
        pageSize: 100,
      }),
    ]);

    deliveryCustomer.value = customerResult;
    availableTickets.value = [...tickets.data].sort((left, right) => ticketBalance(right) - ticketBalance(left));
    availableOutboundBarrels.value = barrels.data.filter((barrel) => barrel.barrel_status === 'SERVICE_POINT_STOCK');

    if (deliveryUsesTicket.value) {
      deliverForm.ticket_id = String(availableTickets.value[0]?.id ?? '');
      deliverForm.ticket_quantity = Math.max(Number(row.ticket_quantity_to_use ?? 1), 1);
    } else {
      deliverForm.ticket_id = '';
      deliverForm.ticket_quantity = 0;
    }
    deliverForm.barrel_id = String(availableOutboundBarrels.value[0]?.id ?? '');
  } catch (error) {
    const apiError = normalizeApiError(error);
    deliveryContextError.value = toChineseErrorMessage(apiError.code, apiError.message);
  } finally {
    deliveryContextLoading.value = false;
  }
}

async function submitDeliver() {
  if (!selectedOrder.value) return;
  if (deliveryUsesTicket.value && !deliverForm.ticket_id) {
    ElMessage.error('该客户没有可用水票，请先销售水票或改为散单订单。');
    return;
  }
  if (!deliverForm.barrel_id) {
    ElMessage.error('请选择送出水桶。');
    return;
  }
  saving.value = true;
  clearError();
  try {
    const payload: Record<string, unknown> = {
      ticket_quantity: deliveryUsesTicket.value ? deliverForm.ticket_quantity : 0,
      inventory_quantity: deliverForm.inventory_quantity,
      barrel_id: deliverForm.barrel_id,
      updated_by: deliverForm.updated_by,
      actor_role: deliverForm.actor_role,
      reason: hasReturnBarrel.value
        ? `${deliverForm.reason || '后台确认配送完成'}；本单有空桶回收，暂未绑定具体桶号`
        : deliverForm.reason || '后台确认配送完成',
    };
    if (deliveryUsesTicket.value) {
      payload.ticket_id = deliverForm.ticket_id;
    }
    if (hasReturnBarrel.value) {
      payload.return_to_holder_type = deliverForm.return_to_holder_type;
      payload.return_to_holder_id = deliverForm.return_to_holder_id;
    }
    await waterApi.orders.deliver(selectedOrder.value.id, payload);
    ElMessage.success('配送已完成');
    deliverVisible.value = false;
    await loadData();
  } catch (error) {
    handleError(error);
  } finally {
    saving.value = false;
  }
}

async function cancelOrder(row: Order) {
  try {
    await ElMessageBox.confirm('确认取消该订单？已配送订单当前 V0 不允许直接取消。', '取消订单', { type: 'warning' });
    await waterApi.orders.cancel(row.id, {
      updated_by: 'admin',
      actor_role: 'ADMIN',
      reason: '后台取消订单',
    });
    ElMessage.success('订单已取消');
    await loadData();
  } catch (error) {
    if (error !== 'cancel') handleError(error);
  }
}

function customerOptionLabel(customer: Customer) {
  return `${customer.customer_name || '未命名客户'}｜${customer.phone_display || '-'}｜${customer.default_address || '暂无默认地址'}`;
}

function addressOptionLabel(address: CustomerAddress) {
  const defaultText = address.is_default ? '默认｜' : '';
  return `${defaultText}${address.address_label || '地址'}｜${address.contact_name || '-'}｜${address.phone_display || '-'}｜${
    address.full_address || address.address_line || '-'
  }｜送水 ${address.delivery_count ?? 0} 次`;
}

function shortId(id?: string) {
  return id ? id.slice(0, 8) : '-';
}

function formatTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
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
