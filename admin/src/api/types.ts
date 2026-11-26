export interface WaterApiMeta {
  requestId: string;
  timestamp: string;
  page?: number;
  pageSize?: number;
  total?: number;
}

export interface WaterApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface WaterApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: WaterApiErrorBody;
  meta: WaterApiMeta;
}

export interface PageResult<T> {
  data: T[];
  meta: WaterApiMeta;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface AuthUser {
  id: string;
  username: string;
  display_name?: string;
  role: string;
  status: string;
  last_login_at?: string | null;
}

export interface LoginResult {
  token: string;
  expires_at: string;
  user: AuthUser;
}

export interface WaterRecord {
  id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type Customer = WaterRecord & {
  customer_name?: string;
  customer_type?: string;
  phone?: string;
  phone_display?: string;
  normalized_phone?: string;
  agent_id?: string;
  agent_name?: string;
  service_point_id?: string;
  service_point_name?: string;
  region_id?: string;
  region_name?: string;
  default_address?: string;
  default_address_label?: string;
  address_count?: number;
  total_delivery_count?: number;
  ticket_balance?: number;
  barrel_count?: number;
  recent_order_at?: string | null;
  latest_delivery_at?: string | null;
  status?: string;
  remark?: string;
};

export type CustomerAddress = WaterRecord & {
  customer_id?: string;
  address_label?: string;
  contact_name?: string;
  contact_phone?: string;
  phone_display?: string;
  normalized_contact_phone?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  address_line?: string;
  full_address?: string;
  region_id?: string | null;
  region_name?: string;
  service_point_id?: string | null;
  service_point_name?: string;
  is_default?: boolean;
  address_status?: string;
  status?: string;
  delivery_count?: number;
  latest_delivery_at?: string | null;
  remark?: string | null;
};

export type CustomerDetail = Customer & {
  addresses?: CustomerAddress[];
  recent_orders?: Order[];
  tickets?: Ticket[];
  barrels?: Barrel[];
  audit_logs?: AuditLog[];
};

export type Order = WaterRecord & {
  customer_id?: string;
  customer_name?: string;
  customer_phone_display?: string | null;
  address_id?: string;
  address_label?: string | null;
  address_contact_name?: string | null;
  address_phone_display?: string | null;
  address_summary?: string;
  order_status?: string;
  payment_status?: string;
  delivery_status?: string;
  agent_id?: string;
  agent_name?: string;
  service_point_id?: string;
  service_point_name?: string;
  delivery_quantity?: number;
  ticket_quantity_to_use?: number;
  barrel_quantity_to_return?: number;
  total_amount?: number | string;
  cash_quantity?: number;
  cash_amount?: number;
  settlement_method?: string;
  settlement_summary?: string;
};

export type Ticket = WaterRecord & {
  customer_id?: string;
  customer_name?: string;
  customer_phone_display?: string | null;
  default_address?: string | null;
  ticket_batch_no?: string;
  ticket_package?: string;
  purchase_summary?: string;
  total_quantity?: number;
  remaining_quantity?: number;
  balance?: number;
  unit_price?: number;
  amount?: number | string;
  payment_method?: string | null;
  payment_status?: string;
  ticket_status?: string;
  confirmed_at?: string | null;
};

export type InventoryBalance = WaterRecord & {
  agent_id?: string;
  agent_name?: string;
  service_point_id?: string;
  service_point_name?: string;
  sku_code?: string;
  sku_name?: string;
  balance?: number;
};

export type InventoryMovement = WaterRecord & {
  movement_type?: string;
  movement_type_label?: string;
  quantity?: number;
  quantity_text?: string;
  agent_id?: string;
  agent_name?: string;
  service_point_id?: string;
  service_point_name?: string;
  sku_code?: string;
  sku_name?: string;
  related_order_id?: string | null;
  related_order_code?: string | null;
  related_order_summary?: string | null;
  from_party_type_label?: string;
  from_party_name?: string;
  to_party_type_label?: string;
  to_party_name?: string;
  operator_name?: string;
  business_summary?: string;
  reason?: string;
};

export type Region = WaterRecord & {
  region_name?: string;
  region_code?: string;
};

export type Agent = WaterRecord & {
  agent_name?: string;
  agent_status?: string;
  contact_name?: string;
};

export type ServicePoint = WaterRecord & {
  service_point_name?: string;
  service_point_status?: string;
  agent_id?: string | null;
  contact_name?: string;
};

export type Barrel = WaterRecord & {
  barrel_code?: string;
  barrel_status?: string;
  current_holder_type?: string;
  current_holder_id?: string;
  qr_code?: string;
  rfid_code?: string;
};

export type BusinessEvent = WaterRecord & {
  event_id?: string;
  event_type?: string;
  event_type_label?: string;
  aggregate_type?: string;
  aggregate_id?: string;
  aggregate_summary?: string;
  related_object_summary?: string;
  sync_status?: string;
  sync_status_label?: string;
  sync_status_note?: string;
  local_status_label?: string;
  sync_attempts?: number;
  last_sync_error?: string | null;
  occurred_at?: string;
  business_summary?: Record<string, unknown>;
  payload_json?: Record<string, unknown>;
};

export type AuditLog = WaterRecord & {
  actor_id?: string;
  actor_role?: string;
  action?: string;
  target_type?: string;
  target_id?: string;
  before_json?: Record<string, unknown> | null;
  after_json?: Record<string, unknown> | null;
  reason?: string | null;
};

export class WaterClientError extends Error {
  code: string;
  details: Record<string, unknown>;

  constructor(error: WaterApiErrorBody) {
    super(error.message);
    this.name = 'WaterClientError';
    this.code = error.code;
    this.details = error.details ?? {};
  }
}
