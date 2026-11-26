import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddWaterTicketPaymentState1781506000000 implements MigrationInterface {
  name = 'AddWaterTicketPaymentState1781506000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('water_tickets');
    if (!table) {
      return;
    }

    await addColumnIfMissing(queryRunner, table, 'amount', {
      name: 'amount',
      type: 'decimal',
      precision: 12,
      scale: 2,
      default: 0,
    });
    await addColumnIfMissing(queryRunner, table, 'payment_method', {
      name: 'payment_method',
      type: 'varchar',
      length: '40',
      isNullable: true,
    });
    await addColumnIfMissing(queryRunner, table, 'payment_status', {
      name: 'payment_status',
      type: 'varchar',
      length: '40',
      default: "'CONFIRMED'",
    });
    await addColumnIfMissing(queryRunner, table, 'ticket_status', {
      name: 'ticket_status',
      type: 'varchar',
      length: '40',
      default: "'ACTIVE'",
    });
    await addColumnIfMissing(queryRunner, table, 'confirmed_by', {
      name: 'confirmed_by',
      type: 'varchar',
      length: '64',
      isNullable: true,
    });
    await addColumnIfMissing(queryRunner, table, 'confirmed_at', {
      name: 'confirmed_at',
      type: 'timestamp',
      isNullable: true,
    });

    await queryRunner.query(
      "UPDATE water_tickets SET payment_status = 'CONFIRMED' WHERE payment_status IS NULL OR payment_status = ''",
    );
    await queryRunner.query(
      "UPDATE water_tickets SET ticket_status = 'ACTIVE' WHERE ticket_status IS NULL OR ticket_status = ''",
    );
    await queryRunner.query(
      'UPDATE water_tickets SET amount = total_quantity * unit_price WHERE amount IS NULL OR amount = 0',
    );
    await queryRunner.query(
      "UPDATE water_tickets SET confirmed_at = created_at WHERE confirmed_at IS NULL AND payment_status = 'CONFIRMED'",
    );

    await addIndexIfMissing(queryRunner, 'water_tickets', 'water_tickets_payment_status_idx', ['payment_status']);
    await addIndexIfMissing(queryRunner, 'water_tickets', 'water_tickets_ticket_status_idx', ['ticket_status']);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('water_tickets');
    if (!table) {
      return;
    }

    await dropIndexIfExists(queryRunner, table, 'water_tickets_ticket_status_idx');
    await dropIndexIfExists(queryRunner, table, 'water_tickets_payment_status_idx');

    for (const columnName of [
      'confirmed_at',
      'confirmed_by',
      'ticket_status',
      'payment_status',
      'payment_method',
      'amount',
    ]) {
      const latest = await queryRunner.getTable('water_tickets');
      if (latest?.findColumnByName(columnName)) {
        await queryRunner.dropColumn('water_tickets', columnName);
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
    await queryRunner.addColumn('water_tickets', new TableColumn(column));
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
    await queryRunner.dropIndex('water_tickets', indexName);
  }
}
