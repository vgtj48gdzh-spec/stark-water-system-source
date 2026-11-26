import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AddressesController, CustomerAddressesController } from './addresses/addresses.controller';
import { AddressesService } from './addresses/addresses.service';
import { AgentsController } from './agents/agents.controller';
import { AgentsService } from './agents/agents.service';
import { WaterActorInterceptor } from './auth/water-actor.interceptor';
import { WaterAuthController } from './auth/water-auth.controller';
import { WaterAuthGuard } from './auth/water-auth.guard';
import { WaterAuthService } from './auth/water-auth.service';
import { AuditLogsController } from './audit-logs/audit-logs.controller';
import { AuditLogsService } from './audit-logs/audit-logs.service';
import { BarrelsController } from './barrels/barrels.controller';
import { BarrelsService } from './barrels/barrels.service';
import { BusinessEventsController } from './business-events/business-events.controller';
import { BusinessEventsService } from './business-events/business-events.service';
import { WaterMockStoreService } from './common/water-mock-store.service';
import { WaterDbService } from './common/water-db.service';
import { WaterTransactionService } from './common/water-transaction.service';
import { WaterFulfillmentService } from './common/water-fulfillment.service';
import { CustomersController } from './customers/customers.controller';
import { CustomersService } from './customers/customers.service';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryService } from './inventory/inventory.service';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { RegionsController } from './regions/regions.controller';
import { RegionsService } from './regions/regions.service';
import { ServicePointsController } from './service-points/service-points.controller';
import { ServicePointsService } from './service-points/service-points.service';
import { TicketsController } from './tickets/tickets.controller';
import { TicketsService } from './tickets/tickets.service';
import { WaterController } from './water.controller';

@Module({
  controllers: [
    WaterController,
    WaterAuthController,
    CustomersController,
    AddressesController,
    CustomerAddressesController,
    RegionsController,
    AgentsController,
    ServicePointsController,
    OrdersController,
    TicketsController,
    InventoryController,
    BarrelsController,
    BusinessEventsController,
    AuditLogsController,
  ],
  providers: [
    WaterMockStoreService,
    WaterAuthService,
    WaterDbService,
    WaterTransactionService,
    WaterFulfillmentService,
    AuditLogsService,
    BusinessEventsService,
    CustomersService,
    AddressesService,
    RegionsService,
    AgentsService,
    ServicePointsService,
    OrdersService,
    TicketsService,
    InventoryService,
    BarrelsService,
    {
      provide: APP_GUARD,
      useClass: WaterAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: WaterActorInterceptor,
    },
  ],
  exports: [AuditLogsService, BusinessEventsService, WaterAuthService, WaterMockStoreService, WaterFulfillmentService],
})
export class WaterModule {}
