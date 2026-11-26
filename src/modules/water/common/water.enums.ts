export enum WaterSyncStatus {
  Pending = 'pending',
  Synced = 'synced',
  Failed = 'failed',
  Ignored = 'ignored',
  Conflict = 'conflict',
}

export enum WaterOrderStatus {
  Draft = 'DRAFT',
  Submitted = 'SUBMITTED',
  Assigned = 'ASSIGNED',
  Delivering = 'DELIVERING',
  Delivered = 'DELIVERED',
  Cancelled = 'CANCELLED',
  Exception = 'EXCEPTION',
}

export enum WaterPaymentStatus {
  Unpaid = 'UNPAID',
  PendingConfirmation = 'PENDING_CONFIRMATION',
  Confirmed = 'CONFIRMED',
  Cancelled = 'CANCELLED',
  Refunded = 'REFUNDED',
  PartiallyRefunded = 'PARTIALLY_REFUNDED',
}

export enum WaterTicketStatus {
  PendingEffective = 'PENDING_EFFECTIVE',
  Active = 'ACTIVE',
  UsedUp = 'USED_UP',
  Refunded = 'REFUNDED',
  Voided = 'VOIDED',
}

export enum WaterTicketPaymentMethod {
  OfflineWechat = 'OFFLINE_WECHAT',
  OfflineAlipay = 'OFFLINE_ALIPAY',
  Cash = 'CASH',
  BankTransfer = 'BANK_TRANSFER',
  Other = 'OTHER',
}

export enum WaterDeliveryStatus {
  Pending = 'PENDING',
  Assigned = 'ASSIGNED',
  OutForDelivery = 'OUT_FOR_DELIVERY',
  Delivered = 'DELIVERED',
  Failed = 'FAILED',
  Rescheduled = 'RESCHEDULED',
}

export enum WaterTicketTransactionType {
  Sold = 'SOLD',
  Used = 'USED',
  Refunded = 'REFUNDED',
  Adjusted = 'ADJUSTED',
  Expired = 'EXPIRED',
  Transferred = 'TRANSFERRED',
}

export enum WaterInventoryMovementType {
  HqToAgent = 'HQ_TO_AGENT',
  AgentToServicePoint = 'AGENT_TO_SERVICE_POINT',
  DeliveryOut = 'DELIVERY_OUT',
  ReturnIn = 'RETURN_IN',
  Damage = 'DAMAGE',
  Loss = 'LOSS',
  StocktakeAdjustment = 'STOCKTAKE_ADJUSTMENT',
}

export enum WaterBarrelStatus {
  HqStock = 'HQ_STOCK',
  AgentStock = 'AGENT_STOCK',
  ServicePointStock = 'SERVICE_POINT_STOCK',
  AtCustomer = 'AT_CUSTOMER',
  Returning = 'RETURNING',
  Damaged = 'DAMAGED',
  Lost = 'LOST',
  Scrapped = 'SCRAPPED',
}

export enum WaterServicePointStatus {
  Lead = 'LEAD',
  Incubating = 'INCUBATING',
  Active = 'ACTIVE',
  Transferred = 'TRANSFERRED',
  Suspended = 'SUSPENDED',
  Terminated = 'TERMINATED',
}

export enum WaterAgentStatus {
  Candidate = 'CANDIDATE',
  Active = 'ACTIVE',
  Warning = 'WARNING',
  Suspended = 'SUSPENDED',
  Terminated = 'TERMINATED',
}

export enum WaterRole {
  Owner = 'OWNER',
  Admin = 'ADMIN',
  HqOperations = 'HQ_OPERATIONS',
  CustomerService = 'CUSTOMER_SERVICE',
  Finance = 'FINANCE',
  Agent = 'AGENT',
  ServicePoint = 'SERVICE_POINT',
  DeliveryStaff = 'DELIVERY_STAFF',
  AiAssistant = 'AI_ASSISTANT',
}

export enum WaterAuditAction {
  ViewFullPhone = 'VIEW_FULL_PHONE',
  CustomerPhoneRevealed = 'customer.phone.revealed',
  CustomerAddressPhoneRevealed = 'customer_address.phone.revealed',
  ExportCustomers = 'EXPORT_CUSTOMERS',
  UpdateAddress = 'UPDATE_ADDRESS',
  ConfirmPayment = 'CONFIRM_PAYMENT',
  UpdateOrderStatus = 'UPDATE_ORDER_STATUS',
  UpdateTicket = 'UPDATE_TICKET',
  AdjustInventory = 'ADJUST_INVENTORY',
  AdjustBarrelAsset = 'ADJUST_BARREL_ASSET',
  PenaltyRefundOrDepositChange = 'PENALTY_REFUND_OR_DEPOSIT_CHANGE',
  CreateCustomer = 'CREATE_CUSTOMER',
  UpdateCustomer = 'UPDATE_CUSTOMER',
  CreateAddress = 'CREATE_ADDRESS',
  CreateOrder = 'CREATE_ORDER',
  AssignOrder = 'ASSIGN_ORDER',
  DeliverOrder = 'DELIVER_ORDER',
  CancelOrder = 'CANCEL_ORDER',
  CreateAgent = 'CREATE_AGENT',
  CreateServicePoint = 'CREATE_SERVICE_POINT',
  TransferServicePoint = 'TRANSFER_SERVICE_POINT',
  SellTicket = 'SELL_TICKET',
  UseTicket = 'USE_TICKET',
  RefundTicket = 'REFUND_TICKET',
  CreateInventoryMovement = 'CREATE_INVENTORY_MOVEMENT',
  CreateBarrel = 'CREATE_BARREL',
  MoveBarrel = 'MOVE_BARREL',
}

export enum WaterBusinessEventType {
  CustomerCreated = 'water.customer.created',
  CustomerUpdated = 'water.customer.updated',
  AgentCreated = 'water.agent.created',
  ServicePointCreated = 'water.service_point.created',
  ServicePointTransferred = 'water.service_point.transferred',
  OrderCreated = 'water.order.created',
  OrderDelivered = 'water.order.delivered',
  OrderCancelled = 'water.order.cancelled',
  TicketSold = 'water.ticket.sold',
  TicketUsed = 'water.ticket.used',
  TicketRefunded = 'water.ticket.refunded',
  InventoryMoved = 'water.inventory.moved',
  BarrelCheckedOut = 'water.barrel.checked_out',
  BarrelReturned = 'water.barrel.returned',
  BarrelLostOrDamaged = 'water.barrel.lost_or_damaged',
  AgentPurchaseOrderCreated = 'water.agent_purchase_order.created',
  AgentPurchaseOrderPaid = 'water.agent_purchase_order.paid',
  DepositReceived = 'water.deposit.received',
  PenaltyCreated = 'water.penalty.created',
  SyncReconciled = 'water.sync.reconciled',
}

export enum WaterDepositType {
  CustomerBarrel = 'CUSTOMER_BARREL',
  AgentPerformance = 'AGENT_PERFORMANCE',
  ServicePointPerformance = 'SERVICE_POINT_PERFORMANCE',
}
