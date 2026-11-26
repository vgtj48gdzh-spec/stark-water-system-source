import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumnOptions,
  TableIndex,
} from 'typeorm';

interface WaterTableDefinition {
  name: string;
  columns: TableColumnOptions[];
  indexes?: string[][];
}

const textNullable = (name: string): TableColumnOptions => ({
  name,
  type: 'text',
  isNullable: true,
});

const varchar = (
  name: string,
  length = 64,
  isNullable = true,
  defaultValue?: string,
): TableColumnOptions => ({
  name,
  type: 'varchar',
  length: String(length),
  isNullable,
  ...(defaultValue !== undefined ? { default: `'${defaultValue}'` } : {}),
});

const intColumn = (name: string, defaultValue?: number, isNullable = false): TableColumnOptions => ({
  name,
  type: 'int',
  isNullable,
  ...(defaultValue !== undefined ? { default: defaultValue } : {}),
});

const decimalColumn = (name: string, defaultValue?: number, isNullable = false): TableColumnOptions => ({
  name,
  type: 'decimal',
  precision: 12,
  scale: 2,
  isNullable,
  ...(defaultValue !== undefined ? { default: defaultValue } : {}),
});

const timestampColumn = (
  name: string,
  isNullable = true,
  defaultValue?: string,
): TableColumnOptions => ({
  name,
  type: 'timestamp',
  isNullable,
  ...(defaultValue ? { default: defaultValue } : {}),
});

const commonColumns = (): TableColumnOptions[] => [
  { name: 'id', type: 'varchar', length: '36', isPrimary: true },
  { name: 'external_id', type: 'varchar', length: '64', isUnique: true },
  varchar('hq_id'),
  { name: 'source_system', type: 'varchar', length: '32', default: "'water'" },
  { name: 'sync_status', type: 'varchar', length: '24', default: "'pending'" },
  textNullable('sync_error'),
  varchar('idempotency_key', 160),
  varchar('company_id'),
  varchar('region_id'),
  varchar('created_by'),
  varchar('updated_by'),
  timestampColumn('created_at', false, 'CURRENT_TIMESTAMP'),
  {
    name: 'updated_at',
    type: 'timestamp',
    default: 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  },
  timestampColumn('deleted_at'),
  textNullable('remark'),
];

const withCommon = (columns: TableColumnOptions[]): TableColumnOptions[] => [
  ...commonColumns(),
  ...columns,
];

const coreTables: WaterTableDefinition[] = [
  {
    name: 'water_customers',
    columns: withCommon([
      varchar('customer_name', 120, false),
      varchar('phone', 32, false),
      varchar('normalized_phone', 32, false),
      varchar('customer_type', 40, false, 'HOUSEHOLD'),
      varchar('default_address_id'),
      varchar('agent_id'),
      varchar('service_point_id'),
    ]),
    indexes: [['phone'], ['agent_id'], ['service_point_id']],
  },
  {
    name: 'water_customer_addresses',
    columns: withCommon([
      varchar('customer_id', 64, false),
      varchar('contact_name', 120, false),
      varchar('contact_phone', 32, false),
      varchar('province', 80),
      varchar('city', 80),
      varchar('district', 80),
      varchar('address_line', 255, false),
      { name: 'is_default', type: 'boolean', default: false },
    ]),
    indexes: [['customer_id'], ['contact_phone']],
  },
  {
    name: 'water_regions',
    columns: withCommon([
      varchar('parent_region_id'),
      varchar('region_name', 120, false),
      { name: 'region_code', type: 'varchar', length: '64', isUnique: true },
      varchar('manager_user_id'),
    ]),
    indexes: [['parent_region_id']],
  },
  {
    name: 'water_agents',
    columns: withCommon([
      varchar('agent_name', 120, false),
      varchar('agent_status', 40, false, 'CANDIDATE'),
      varchar('contact_name', 120),
      varchar('contact_phone', 32),
      decimalColumn('deposit_required_amount', 0),
      decimalColumn('deposit_paid_amount', 0),
      intColumn('base_sales_volume', 0),
    ]),
    indexes: [['agent_status'], ['contact_phone']],
  },
  {
    name: 'water_service_points',
    columns: withCommon([
      varchar('service_point_name', 120, false),
      varchar('service_point_status', 40, false, 'LEAD'),
      varchar('agent_id'),
      varchar('contact_name', 120),
      varchar('contact_phone', 32),
      { name: 'incubated_by_hq', type: 'boolean', default: true },
      timestampColumn('transfer_at'),
    ]),
    indexes: [['agent_id'], ['service_point_status']],
  },
  {
    name: 'water_orders',
    columns: withCommon([
      varchar('customer_id', 64, false),
      varchar('address_id'),
      varchar('order_status', 40, false, 'DRAFT'),
      varchar('payment_status', 40, false, 'UNPAID'),
      varchar('delivery_status', 40, false, 'PENDING'),
      varchar('agent_id'),
      varchar('service_point_id'),
      varchar('delivery_staff_id'),
      intColumn('ticket_quantity_to_use', 0),
      intColumn('barrel_quantity_to_return', 0),
      decimalColumn('total_amount', 0),
    ]),
    indexes: [['customer_id'], ['order_status'], ['payment_status'], ['delivery_status']],
  },
  {
    name: 'water_tickets',
    columns: withCommon([
      varchar('customer_id', 64, false),
      varchar('ticket_batch_no', 80, false),
      intColumn('total_quantity'),
      intColumn('remaining_quantity'),
      decimalColumn('unit_price'),
      timestampColumn('expires_at'),
    ]),
    indexes: [['customer_id'], ['ticket_batch_no']],
  },
  {
    name: 'water_ticket_transactions',
    columns: withCommon([
      varchar('ticket_id'),
      varchar('customer_id', 64, false),
      varchar('transaction_type', 40, false),
      intColumn('quantity'),
      varchar('related_order_id'),
    ]),
    indexes: [['ticket_id'], ['customer_id'], ['transaction_type']],
  },
  {
    name: 'water_agent_purchase_orders',
    columns: withCommon([
      varchar('agent_id', 64, false),
      varchar('purchase_order_no', 80, false),
      intColumn('quantity'),
      decimalColumn('unit_price'),
      varchar('payment_status', 40, false, 'UNPAID'),
      varchar('shipment_status', 40, false, 'PENDING'),
    ]),
    indexes: [['agent_id'], ['purchase_order_no'], ['payment_status']],
  },
  {
    name: 'water_agent_inventory',
    columns: withCommon([
      varchar('agent_id'),
      varchar('service_point_id'),
      varchar('sku_code', 64, false, 'barrel_water_18l'),
      intColumn('quantity_on_hand', 0),
      intColumn('quantity_reserved', 0),
    ]),
    indexes: [['agent_id', 'service_point_id', 'sku_code']],
  },
  {
    name: 'water_inventory_movements',
    columns: withCommon([
      varchar('movement_type', 60, false),
      varchar('agent_id'),
      varchar('service_point_id'),
      varchar('sku_code', 64, false, 'barrel_water_18l'),
      intColumn('quantity'),
      varchar('related_order_id'),
      varchar('related_purchase_order_id'),
    ]),
    indexes: [['movement_type'], ['agent_id'], ['service_point_id'], ['related_order_id']],
  },
  {
    name: 'water_barrels',
    columns: withCommon([
      { name: 'barrel_code', type: 'varchar', length: '80', isUnique: true },
      varchar('qr_code', 120),
      varchar('rfid_code', 120),
      varchar('barrel_status', 40, false, 'HQ_STOCK'),
      varchar('current_holder_type', 40),
      varchar('current_holder_id'),
    ]),
    indexes: [['barrel_status'], ['current_holder_type', 'current_holder_id']],
  },
  {
    name: 'water_barrel_movements',
    columns: withCommon([
      varchar('barrel_id', 64, false),
      varchar('movement_type', 60, false),
      varchar('from_holder_type', 40),
      varchar('from_holder_id'),
      varchar('to_holder_type', 40),
      varchar('to_holder_id'),
    ]),
    indexes: [['barrel_id'], ['movement_type'], ['to_holder_type', 'to_holder_id']],
  },
  {
    name: 'water_deposits',
    columns: withCommon([
      varchar('deposit_type', 60, false),
      varchar('owner_type', 40, false),
      varchar('owner_id', 64, false),
      decimalColumn('amount'),
      decimalColumn('balance_amount'),
      varchar('deposit_status', 40, false, 'HELD'),
    ]),
    indexes: [['deposit_type'], ['owner_type', 'owner_id']],
  },
  {
    name: 'water_growth_assessments',
    columns: withCommon([
      varchar('agent_id', 64, false),
      varchar('period', 16, false),
      intColumn('base_volume', 0),
      intColumn('actual_volume', 0),
      intColumn('growth_volume', 0),
      decimalColumn('penalty_amount', 0),
    ]),
    indexes: [['agent_id', 'period']],
  },
  {
    name: 'water_penalties',
    columns: withCommon([
      varchar('agent_id', 64, false),
      varchar('penalty_type', 60, false),
      decimalColumn('amount'),
      varchar('penalty_status', 40, false, 'PENDING'),
      textNullable('reason'),
    ]),
    indexes: [['agent_id'], ['penalty_status']],
  },
  {
    name: 'water_business_events',
    columns: withCommon([
      { name: 'event_id', type: 'varchar', length: '64', isUnique: true },
      varchar('event_type', 120, false),
      varchar('aggregate_type', 80, false),
      varchar('aggregate_id', 64, false),
      { name: 'payload_json', type: 'json' },
      intColumn('event_version', 1),
      timestampColumn('occurred_at', false, 'CURRENT_TIMESTAMP'),
      intColumn('sync_attempts', 0),
      textNullable('last_sync_error'),
    ]),
    indexes: [['event_type'], ['aggregate_type', 'aggregate_id']],
  },
  {
    name: 'water_audit_logs',
    columns: withCommon([
      varchar('actor_id', 64, false),
      varchar('actor_role', 40, false),
      varchar('action', 80, false),
      varchar('target_type', 80, false),
      varchar('target_id'),
      { name: 'metadata_json', type: 'json', isNullable: true },
      { name: 'before_json', type: 'json', isNullable: true },
      { name: 'after_json', type: 'json', isNullable: true },
      textNullable('reason'),
      varchar('ip_address', 80),
      varchar('user_agent', 255),
    ]),
    indexes: [['actor_id'], ['action'], ['target_type', 'target_id']],
  },
];

function commonIndexes(tableName: string): TableIndex[] {
  return [
    new TableIndex({ name: `${tableName}_hq_id_idx`, columnNames: ['hq_id'] }),
    new TableIndex({ name: `${tableName}_sync_status_idx`, columnNames: ['sync_status'] }),
    new TableIndex({ name: `${tableName}_company_region_idx`, columnNames: ['company_id', 'region_id'] }),
    new TableIndex({ name: `${tableName}_idempotency_idx`, columnNames: ['idempotency_key'] }),
    new TableIndex({ name: `${tableName}_deleted_at_idx`, columnNames: ['deleted_at'] }),
  ];
}

function tableIndexes(definition: WaterTableDefinition): TableIndex[] {
  return [
    ...commonIndexes(definition.name),
    ...(definition.indexes ?? []).map(
      (columnNames) =>
        new TableIndex({
          name: `${definition.name}_${columnNames.join('_')}_idx`,
          columnNames,
        }),
    ),
  ];
}

export class CreateWaterCoreTables1781136000000 implements MigrationInterface {
  name = 'CreateWaterCoreTables1781136000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const definition of coreTables) {
      const exists = await queryRunner.hasTable(definition.name);
      if (exists) {
        continue;
      }

      await queryRunner.createTable(
        new Table({
          name: definition.name,
          columns: definition.columns,
          indices: tableIndexes(definition),
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const definition of [...coreTables].reverse()) {
      const exists = await queryRunner.hasTable(definition.name);
      if (exists) {
        await queryRunner.dropTable(definition.name);
      }
    }
  }
}
