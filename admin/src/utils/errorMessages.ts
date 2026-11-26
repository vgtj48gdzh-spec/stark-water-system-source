const errorMessages: Record<string, string> = {
  ERR_NETWORK: '无法连接水系统后端，请确认 3001 后端已经启动，并且当前页面连接的是 stark-water-system 后端。',
  ECONNABORTED: '请求超时，请确认后端和数据库仍在运行。',
  ERR_BAD_REQUEST: '请求失败，请检查接口地址、请求参数或登录状态。',
  WATER_CUSTOMER_NOT_FOUND: '客户不存在。',
  WATER_CUSTOMER_PHONE_EXISTS: '该手机号已存在客户，不能重复创建。请进入已有客户详情后新增地址或联系人。',
  WATER_ADDRESS_NOT_FOUND: '地址不存在。',
  WATER_AGENT_NOT_FOUND: '代理不存在。',
  WATER_SERVICE_POINT_NOT_FOUND: '服务点不存在。',
  WATER_ORDER_NOT_FOUND: '订单不存在。',
  WATER_TICKET_NOT_FOUND: '水票不存在。',
  WATER_TICKET_INSUFFICIENT_BALANCE: '水票余额不足，不能核销。',
  WATER_INVENTORY_INSUFFICIENT: '库存不足，不能出库。',
  WATER_BARREL_NOT_FOUND: '桶资产不存在。',
  WATER_BARREL_INVALID_STATE: '桶状态不允许当前操作。',
  WATER_ORDER_INVALID_STATUS: '订单状态不允许当前操作。',
  WATER_PAYMENT_STATUS_INVALID: '付款状态不允许当前操作。',
  WATER_IDEMPOTENCY_KEY_REQUIRED: '缺少幂等键，请重新提交。',
  WATER_IDEMPOTENCY_CONFLICT: '检测到重复请求或幂等冲突，本次没有重复扣减。',
  WATER_PERMISSION_DENIED: '权限不足或登录已过期，请重新登录。',
  WATER_VALIDATION_FAILED: '表单校验失败，请检查必填项和格式。',
  WATER_INTERNAL_ERROR: '系统内部错误，请记录当前操作并联系管理员。',
};

export function toChineseErrorMessage(code?: string, message?: string): string {
  if (!code && !message) return '';
  if (message?.includes('Network Error')) {
    return errorMessages.ERR_NETWORK;
  }
  if (message?.includes('status code 404')) {
    return '接口不存在或后端版本不匹配，请确认启动的是水系统后端：http://127.0.0.1:3001。';
  }
  if (message?.includes('status code 401')) {
    return '登录已过期或未登录，请重新登录。';
  }
  if (code && errorMessages[code]) {
    return errorMessages[code];
  }
  return message || '操作失败，请稍后重试。';
}
