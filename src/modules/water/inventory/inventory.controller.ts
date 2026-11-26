import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { filterRecords, paginateRecords, waterOk, waterPage } from '../common/water-api-response';
import { WaterDbService } from '../common/water-db.service';
import { InventoryListQueryDto, InventoryMovementListQueryDto } from '../common/water-query.dto';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { InventoryService } from './inventory.service';

@ApiTags('water-inventory')
@Controller('water/inventory')
export class InventoryController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly db: WaterDbService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List computed water inventory balances.' })
  async list(@Query() query: InventoryListQueryDto) {
    const dbBalances = await this.db.listInventoryBalances();
    const list = dbBalances ? { computed_balances: dbBalances } : this.inventory.list();
    const records = filterRecords(list.computed_balances as Record<string, unknown>[], query as Record<string, unknown>);
    return waterPage(paginateRecords(records, query));
  }

  @Get('movements')
  @ApiOperation({ summary: 'List water inventory movement ledger.' })
  async listMovements(@Query() query: InventoryMovementListQueryDto) {
    const dbMovements = await this.db.listInventoryMovements();
    const list = dbMovements ? { movements: dbMovements } : this.inventory.list();
    const records = filterRecords(list.movements as Record<string, unknown>[], query as Record<string, unknown>);
    return waterPage(paginateRecords(records, query));
  }

  @Post('movements')
  @ApiOperation({ summary: 'Create water inventory movement. Balance is derived from movement ledger.' })
  async createMovement(@Body() dto: CreateInventoryMovementDto) {
    return waterOk((await this.db.createInventoryMovement(dto)) ?? this.inventory.createMovement(dto));
  }
}
