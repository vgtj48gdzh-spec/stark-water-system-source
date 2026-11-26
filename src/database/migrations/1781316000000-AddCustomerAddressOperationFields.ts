import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddCustomerAddressOperationFields1781316000000 implements MigrationInterface {
  name = 'AddCustomerAddressOperationFields1781316000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('water_customer_addresses');
    if (!table) {
      return;
    }

    await addColumnIfMissing(queryRunner, table, 'normalized_contact_phone', {
      name: 'normalized_contact_phone',
      type: 'varchar',
      length: '32',
      isNullable: true,
    });
    await addColumnIfMissing(queryRunner, table, 'address_label', {
      name: 'address_label',
      type: 'varchar',
      length: '40',
      isNullable: true,
    });
    await addColumnIfMissing(queryRunner, table, 'service_point_id', {
      name: 'service_point_id',
      type: 'varchar',
      length: '64',
      isNullable: true,
    });
    await addColumnIfMissing(queryRunner, table, 'address_status', {
      name: 'address_status',
      type: 'varchar',
      length: '40',
      default: "'ACTIVE'",
    });

    await queryRunner.query(
      "UPDATE water_customer_addresses SET normalized_contact_phone = contact_phone WHERE normalized_contact_phone IS NULL",
    );
    await queryRunner.query("UPDATE water_customer_addresses SET address_status = 'ACTIVE' WHERE address_status IS NULL");

    await addIndexIfMissing(queryRunner, 'water_customer_addresses', 'water_customer_addresses_service_point_id_idx', [
      'service_point_id',
    ]);
    await addIndexIfMissing(queryRunner, 'water_customer_addresses', 'water_customer_addresses_address_status_idx', [
      'address_status',
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('water_customer_addresses');
    if (!table) {
      return;
    }

    await dropIndexIfExists(queryRunner, table, 'water_customer_addresses_address_status_idx');
    await dropIndexIfExists(queryRunner, table, 'water_customer_addresses_service_point_id_idx');

    for (const columnName of ['address_status', 'service_point_id', 'address_label', 'normalized_contact_phone']) {
      const latest = await queryRunner.getTable('water_customer_addresses');
      if (latest?.findColumnByName(columnName)) {
        await queryRunner.dropColumn('water_customer_addresses', columnName);
      }
    }
  }
}

async function addColumnIfMissing(
  queryRunner: QueryRunner,
  table: Awaited<ReturnType<QueryRunner['getTable']>>,
  columnName: string,
  column: ConstructorParameters<typeof TableColumn>[0],
): Promise<void> {
  if (!table?.findColumnByName(columnName)) {
    await queryRunner.addColumn('water_customer_addresses', new TableColumn(column));
  }
}

async function addIndexIfMissing(
  queryRunner: QueryRunner,
  tableName: string,
  indexName: string,
  columnNames: string[],
): Promise<void> {
  const table = await queryRunner.getTable(tableName);
  if (!table?.indices.some((index) => index.name === indexName)) {
    await queryRunner.createIndex(tableName, new TableIndex({ name: indexName, columnNames }));
  }
}

async function dropIndexIfExists(
  queryRunner: QueryRunner,
  table: Awaited<ReturnType<QueryRunner['getTable']>>,
  indexName: string,
): Promise<void> {
  if (table?.indices.some((index) => index.name === indexName)) {
    await queryRunner.dropIndex('water_customer_addresses', indexName);
  }
}
