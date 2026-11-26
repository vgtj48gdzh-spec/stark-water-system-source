export interface LabelOption {
  value: string;
  label: string;
}

export const orderStatusOptions: LabelOption[] = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'SUBMITTED', label: '已提交' },
  { value: 'ASSIGNED', label: '已分配' },
  { value: 'DELIVERING', label: '配送中' },
  { value: 'DELIVERED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'EXCEPTION', label: '异常' },
];

export const paymentStatusOptions: LabelOption[] = [
  { value: 'UNPAID', label: '未付款' },
  { value: 'PENDING_CONFIRMATION', label: '待确认' },
  { value: 'CONFIRMED', label: '已确认' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'REFUNDED', label: '已退款' },
  { value: 'PARTIALLY_REFUNDED', label: '部分退款' },
];

export const ticketStatusOptions: LabelOption[] = [
  { value: 'PENDING_EFFECTIVE', label: '待生效' },
  { value: 'ACTIVE', label: '已生效' },
  { value: 'USED_UP', label: '已用完' },
  { value: 'REFUNDED', label: '已退款' },
  { value: 'VOIDED', label: '已作废' },
];

export const ticketPaymentMethodOptions: LabelOption[] = [
  { value: 'OFFLINE_WECHAT', label: '线下微信' },
  { value: 'OFFLINE_ALIPAY', label: '线下支付宝' },
  { value: 'CASH', label: '现金' },
  { value: 'BANK_TRANSFER', label: '银行转账' },
  { value: 'OTHER', label: '其他' },
];

export const deliveryStatusOptions: LabelOption[] = [
  { value: 'PENDING', label: '待配送' },
  { value: 'ASSIGNED', label: '已分配' },
  { value: 'OUT_FOR_DELIVERY', label: '配送中' },
  { value: 'DELIVERED', label: '已送达' },
  { value: 'FAILED', label: '配送失败' },
  { value: 'RESCHEDULED', label: '改期配送' },
];

export const syncStatusOptions: LabelOption[] = [
  { value: 'pending', label: '待同步' },
  { value: 'synced', label: '已同步' },
  { value: 'failed', label: '同步失败' },
  { value: 'ignored', label: '已忽略' },
  { value: 'conflict', label: '冲突' },
];

export const roleOptions: LabelOption[] = [
  { value: 'OWNER', label: '老板 / 最高管理员' },
  { value: 'ADMIN', label: '系统管理员' },
  { value: 'HQ_OPERATIONS', label: '总部运营' },
  { value: 'CUSTOMER_SERVICE', label: '客服' },
  { value: 'FINANCE', label: '财务' },
  { value: 'AGENT', label: '代理商' },
  { value: 'SERVICE_POINT', label: '服务点' },
  { value: 'DELIVERY_STAFF', label: '配送员' },
];

export const barrelStatusOptions: LabelOption[] = [
  { value: 'HQ_STOCK', label: '总部库存' },
  { value: 'AGENT_STOCK', label: '代理库存' },
  { value: 'SERVICE_POINT_STOCK', label: '服务点库存' },
  { value: 'AT_CUSTOMER', label: '客户处' },
  { value: 'RETURNING', label: '回收中' },
  { value: 'DAMAGED', label: '损坏' },
  { value: 'LOST', label: '丢失' },
  { value: 'SCRAPPED', label: '报废' },
];

export const holderTypeOptions: LabelOption[] = [
  { value: 'HQ', label: '总部' },
  { value: 'AGENT', label: '代理' },
  { value: 'SERVICE_POINT', label: '服务点' },
  { value: 'CUSTOMER', label: '客户' },
];

export const inventoryMovementTypeOptions: LabelOption[] = [
  { value: 'HQ_TO_AGENT', label: '总部调拨给代理' },
  { value: 'AGENT_TO_SERVICE_POINT', label: '代理调拨给服务点' },
  { value: 'DELIVERY_OUT', label: '配送出库' },
  { value: 'RETURN_IN', label: '退回入库' },
  { value: 'DAMAGE', label: '损坏出库' },
  { value: 'LOSS', label: '丢失出库' },
  { value: 'STOCKTAKE_ADJUSTMENT', label: '盘点调整' },
];

export function labelFrom(options: LabelOption[], value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  const raw = String(value);
  return options.find((item) => item.value === raw)?.label ?? raw;
}

export const orderStatusLabel = (value: unknown) => labelFrom(orderStatusOptions, value);
export const paymentStatusLabel = (value: unknown) => labelFrom(paymentStatusOptions, value);
export const ticketStatusLabel = (value: unknown) => labelFrom(ticketStatusOptions, value);
export const ticketPaymentMethodLabel = (value: unknown) => labelFrom(ticketPaymentMethodOptions, value);
export const deliveryStatusLabel = (value: unknown) => labelFrom(deliveryStatusOptions, value);
export const syncStatusLabel = (value: unknown) => labelFrom(syncStatusOptions, value);
export const roleLabel = (value: unknown) => labelFrom(roleOptions, value);
export const barrelStatusLabel = (value: unknown) => labelFrom(barrelStatusOptions, value);
export const holderTypeLabel = (value: unknown) => labelFrom(holderTypeOptions, value);
export const inventoryMovementTypeLabel = (value: unknown) => labelFrom(inventoryMovementTypeOptions, value);
