import { createIdempotencyKey, requestData, requestPage } from './http';
import type {
  AuditLog,
  Barrel,
  BusinessEvent,
  Customer,
  CustomerAddress,
  CustomerDetail,
  InventoryBalance,
  InventoryMovement,
  Order,
  PageQuery,
  PageResult,
  Agent,
  Region,
  ServicePoint,
  Ticket,
  WaterRecord,
} from './types';

type Payload = Record<string, unknown>;

function withIdempotency(prefix: string, payload: Payload): Payload {
  return {
    ...payload,
    idempotency_key: payload.idempotency_key || createIdempotencyKey(prefix),
  };
}

export const waterApi = {
  customers: {
    list(params: PageQuery): Promise<PageResult<Customer>> {
      return requestPage<Customer>({ method: 'GET', url: '/api/water/customers', params });
    },
    get(id: string): Promise<Customer> {
      return requestData<Customer>({
        method: 'GET',
        url: `/api/water/customers/${id}`,
      });
    },
    detail(id: string): Promise<CustomerDetail> {
      return requestData<CustomerDetail>({
        method: 'GET',
        url: `/api/water/customers/${id}/detail`,
      });
    },
    addresses(customerId: string): Promise<CustomerAddress[]> {
      return requestData<CustomerAddress[]>({
        method: 'GET',
        url: `/api/water/customers/${customerId}/addresses`,
      });
    },
    create(payload: Payload): Promise<Customer> {
      return requestData<Customer>({
        method: 'POST',
        url: '/api/water/customers',
        data: payload,
      });
    },
    update(id: string, payload: Payload): Promise<Customer> {
      return requestData<Customer>({
        method: 'PATCH',
        url: `/api/water/customers/${id}`,
        data: payload,
      });
    },
    createAddress(customerId: string, payload: Payload): Promise<CustomerAddress> {
      return requestData<CustomerAddress>({
        method: 'POST',
        url: `/api/water/customers/${customerId}/addresses`,
        data: withIdempotency('admin-address', payload),
      });
    },
    updateAddress(addressId: string, payload: Payload): Promise<CustomerAddress> {
      return requestData<CustomerAddress>({
        method: 'PATCH',
        url: `/api/water/customer-addresses/${addressId}`,
        data: payload,
      });
    },
    setDefaultAddress(addressId: string, reason: string): Promise<CustomerAddress> {
      return requestData<CustomerAddress>({
        method: 'POST',
        url: `/api/water/customer-addresses/${addressId}/set-default`,
        data: { reason },
      });
    },
    revealAddressPhone(addressId: string, reason: string): Promise<CustomerAddress> {
      return requestData<CustomerAddress>({
        method: 'POST',
        url: `/api/water/customer-addresses/${addressId}/reveal-phone`,
        data: { reason },
      });
    },
    revealPhone(customerId: string, reason: string): Promise<WaterRecord> {
      return requestData<WaterRecord>({
        method: 'POST',
        url: `/api/water/customers/${customerId}/reveal-phone`,
        data: { reason },
      });
    },
  },
  orders: {
    list(params: PageQuery): Promise<PageResult<Order>> {
      return requestPage<Order>({ method: 'GET', url: '/api/water/orders', params });
    },
    create(payload: Payload): Promise<Order> {
      return requestData<Order>({
        method: 'POST',
        url: '/api/water/orders',
        data: withIdempotency('admin-order', payload),
      });
    },
    assign(id: string, payload: Payload): Promise<Order> {
      return requestData<Order>({
        method: 'PATCH',
        url: `/api/water/orders/${id}/assign`,
        data: payload,
      });
    },
    deliver(id: string, payload: Payload): Promise<WaterRecord> {
      return requestData<WaterRecord>({
        method: 'PATCH',
        url: `/api/water/orders/${id}/deliver`,
        data: withIdempotency('admin-deliver', payload),
      });
    },
    cancel(id: string, payload: Payload): Promise<Order> {
      return requestData<Order>({
        method: 'PATCH',
        url: `/api/water/orders/${id}/cancel`,
        data: payload.idempotency_key ? payload : withIdempotency('admin-cancel', payload),
      });
    },
  },
  tickets: {
    list(params: PageQuery): Promise<PageResult<Ticket>> {
      return requestPage<Ticket>({ method: 'GET', url: '/api/water/tickets', params });
    },
    sell(payload: Payload): Promise<WaterRecord> {
      return requestData<WaterRecord>({
        method: 'POST',
        url: '/api/water/tickets/sell',
        data: withIdempotency('admin-ticket-sell', payload),
      });
    },
    use(payload: Payload): Promise<WaterRecord> {
      return requestData<WaterRecord>({
        method: 'POST',
        url: '/api/water/tickets/use',
        data: withIdempotency('admin-ticket-use', payload),
      });
    },
    refund(payload: Payload): Promise<WaterRecord> {
      return requestData<WaterRecord>({
        method: 'POST',
        url: '/api/water/tickets/refund',
        data: withIdempotency('admin-ticket-refund', payload),
      });
    },
    confirmPayment(id: string, payload: Payload): Promise<WaterRecord> {
      return requestData<WaterRecord>({
        method: 'POST',
        url: `/api/water/tickets/${id}/confirm-payment`,
        data: withIdempotency('admin-ticket-confirm', payload),
      });
    },
    cancelPurchase(id: string, payload: Payload): Promise<WaterRecord> {
      return requestData<WaterRecord>({
        method: 'POST',
        url: `/api/water/tickets/${id}/cancel`,
        data: withIdempotency('admin-ticket-cancel', payload),
      });
    },
  },
  inventory: {
    balances(params: PageQuery): Promise<PageResult<InventoryBalance>> {
      return requestPage<InventoryBalance>({ method: 'GET', url: '/api/water/inventory', params });
    },
    movements(params: PageQuery): Promise<PageResult<InventoryMovement>> {
      return requestPage<InventoryMovement>({ method: 'GET', url: '/api/water/inventory/movements', params });
    },
    createMovement(payload: Payload): Promise<InventoryMovement> {
      return requestData<InventoryMovement>({
        method: 'POST',
        url: '/api/water/inventory/movements',
        data: withIdempotency('admin-inventory', payload),
      });
    },
  },
  barrels: {
    list(params: PageQuery): Promise<PageResult<Barrel>> {
      return requestPage<Barrel>({ method: 'GET', url: '/api/water/barrels', params });
    },
    create(payload: Payload): Promise<Barrel> {
      return requestData<Barrel>({
        method: 'POST',
        url: '/api/water/barrels',
        data: payload,
      });
    },
    movements(id: string, params: PageQuery): Promise<PageResult<WaterRecord>> {
      return requestPage<WaterRecord>({ method: 'GET', url: `/api/water/barrels/${id}/movements`, params });
    },
    move(id: string, payload: Payload): Promise<WaterRecord> {
      return requestData<WaterRecord>({
        method: 'POST',
        url: `/api/water/barrels/${id}/movements`,
        data: withIdempotency('admin-barrel-move', payload),
      });
    },
    return(id: string, payload: Payload): Promise<WaterRecord> {
      return requestData<WaterRecord>({
        method: 'POST',
        url: `/api/water/barrels/${id}/return`,
        data: withIdempotency('admin-barrel-return', payload),
      });
    },
    lostOrDamaged(id: string, payload: Payload): Promise<WaterRecord> {
      return requestData<WaterRecord>({
        method: 'POST',
        url: `/api/water/barrels/${id}/lost-or-damaged`,
        data: withIdempotency('admin-barrel-exception', payload),
      });
    },
  },
  events: {
    list(params: PageQuery): Promise<PageResult<BusinessEvent>> {
      return requestPage<BusinessEvent>({ method: 'GET', url: '/api/water/business-events', params });
    },
    ack(id: string, payload: Payload): Promise<BusinessEvent> {
      return requestData<BusinessEvent>({
        method: 'POST',
        url: `/api/water/business-events/${id}/ack`,
        data: withIdempotency('admin-event-ack', payload),
      });
    },
  },
  auditLogs: {
    list(params: PageQuery): Promise<PageResult<AuditLog>> {
      return requestPage<AuditLog>({ method: 'GET', url: '/api/water/audit-logs', params });
    },
  },
  regions: {
    list(params: PageQuery = {}): Promise<PageResult<Region>> {
      return requestPage<Region>({ method: 'GET', url: '/api/water/regions', params });
    },
  },
  agents: {
    list(params: PageQuery = {}): Promise<PageResult<Agent>> {
      return requestPage<Agent>({ method: 'GET', url: '/api/water/agents', params });
    },
  },
  servicePoints: {
    list(params: PageQuery = {}): Promise<PageResult<ServicePoint>> {
      return requestPage<ServicePoint>({ method: 'GET', url: '/api/water/service-points', params });
    },
  },
};
