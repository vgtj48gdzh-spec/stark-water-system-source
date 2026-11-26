import 'dotenv/config';
import { DataSource } from 'typeorm';
import { waterEntities } from '../modules/water/water.entities';
import { CreateWaterCoreTables1781136000000 } from './migrations/1781136000000-CreateWaterCoreTables';
import { CreateWaterAdminAuthTables1781226000000 } from './migrations/1781226000000-CreateWaterAdminAuthTables';
import { AddCustomerAddressOperationFields1781316000000 } from './migrations/1781316000000-AddCustomerAddressOperationFields';
import { AddWaterTicketPaymentState1781506000000 } from './migrations/1781506000000-AddWaterTicketPaymentState';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3308),
  username: process.env.DB_USERNAME ?? '',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? '',
  entities: waterEntities,
  migrations: [
    CreateWaterCoreTables1781136000000,
    CreateWaterAdminAuthTables1781226000000,
    AddCustomerAddressOperationFields1781316000000,
    AddWaterTicketPaymentState1781506000000,
  ],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true' || process.env.TYPEORM_LOGGING === 'true',
});
