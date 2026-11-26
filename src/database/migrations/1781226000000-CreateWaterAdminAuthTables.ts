import { MigrationInterface, QueryRunner, Table, TableColumnOptions, TableIndex } from 'typeorm';

const textNullable = (name: string): TableColumnOptions => ({
  name,
  type: 'text',
  isNullable: true,
});

const varchar = (name: string, length = 64, isNullable = true, defaultValue?: string): TableColumnOptions => ({
  name,
  type: 'varchar',
  length: String(length),
  isNullable,
  ...(defaultValue !== undefined ? { default: `'${defaultValue}'` } : {}),
});

const timestampColumn = (name: string, isNullable = true, defaultValue?: string): TableColumnOptions => ({
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

const withCommon = (columns: TableColumnOptions[]): TableColumnOptions[] => [...commonColumns(), ...columns];

export class CreateWaterAdminAuthTables1781226000000 implements MigrationInterface {
  name = 'CreateWaterAdminAuthTables1781226000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'water_admin_users',
        columns: withCommon([
          varchar('username', 80, false),
          varchar('password_hash', 255, false),
          varchar('display_name', 120),
          varchar('role', 40, false),
          varchar('status', 24, false, 'ACTIVE'),
          timestampColumn('last_login_at'),
        ]),
      }),
      true,
    );
    await queryRunner.createIndices('water_admin_users', [
      new TableIndex({ name: 'idx_water_admin_users_username', columnNames: ['username'], isUnique: true }),
      new TableIndex({ name: 'idx_water_admin_users_role', columnNames: ['role'] }),
      new TableIndex({ name: 'idx_water_admin_users_status', columnNames: ['status'] }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'water_admin_sessions',
        columns: withCommon([
          varchar('user_id', 64, false),
          varchar('token_hash', 64, false),
          timestampColumn('expires_at', false),
          timestampColumn('revoked_at'),
          timestampColumn('last_seen_at'),
          varchar('ip_address', 80),
          varchar('user_agent', 255),
        ]),
      }),
      true,
    );
    await queryRunner.createIndices('water_admin_sessions', [
      new TableIndex({ name: 'idx_water_admin_sessions_token_hash', columnNames: ['token_hash'], isUnique: true }),
      new TableIndex({ name: 'idx_water_admin_sessions_user_id', columnNames: ['user_id'] }),
      new TableIndex({ name: 'idx_water_admin_sessions_expires_at', columnNames: ['expires_at'] }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('water_admin_sessions', true);
    await queryRunner.dropTable('water_admin_users', true);
  }
}
