import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { filterRecords, paginateRecords, waterOk, waterPage } from '../common/water-api-response';
import { WaterDbService } from '../common/water-db.service';
import { OrderListQueryDto } from '../common/water-query.dto';
import { WaterFulfillmentService } from '../common/water-fulfillment.service';
import { AssignOrderDto } from './dto/assign-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto, DeliverOrderDto } from './dto/deliver-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('water-orders')
@Controller('water/orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly fulfillment: WaterFulfillmentService,
    private readonly db: WaterDbService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List water orders with status, owner, time, and pagination filters.' })
  async list(@Query() query: OrderListQueryDto) {
    const records = (await this.db.listOrders()) ?? (this.orders.list() as Record<string, unknown>[]);
    const filtered = filterRecords(records, query as Record<string, unknown>);
    return waterPage(paginateRecords(filtered, query));
  }

  @Post()
  @ApiOperation({ summary: 'Create a water order with idempotency protection.' })
  async create(@Body() dto: CreateOrderDto) {
    return waterOk((await this.db.createOrder(dto)) ?? this.orders.create(dto));
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign a water order to agent, service point, or delivery staff.' })
  async assign(@Param('id') id: string, @Body() dto: AssignOrderDto) {
    return waterOk((await this.db.assignOrder(id, dto)) ?? this.orders.assign(id, dto));
  }

  @Patch(':id/deliver')
  @ApiOperation({ summary: 'Complete delivery and atomically settle ticket, inventory, barrel, events, and audit.' })
  async deliver(@Param('id') id: string, @Body() dto: DeliverOrderDto) {
    return waterOk((await this.db.deliverOrder(id, dto)) ?? (await this.fulfillment.deliverOrderWithSettlement(id, dto)));
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an undelivered water order.' })
  async cancel(@Param('id') id: string, @Body() dto: CancelOrderDto) {
    return waterOk((await this.db.cancelOrder(id, dto)) ?? this.orders.cancelOrder(id, dto));
  }
}
