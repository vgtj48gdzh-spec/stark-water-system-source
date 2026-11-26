import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { filterRecords, paginateRecords, waterOk, waterPage } from '../common/water-api-response';
import { WaterDbService } from '../common/water-db.service';
import { BarrelListQueryDto, WaterPageQueryDto } from '../common/water-query.dto';
import { WaterBarrelStatus } from '../common/water.enums';
import { BarrelsService } from './barrels.service';
import {
  CreateBarrelMovementDto,
  MarkBarrelLostOrDamagedDto,
  ReturnBarrelDto,
} from './dto/create-barrel-movement.dto';
import { CreateBarrelDto } from './dto/create-barrel.dto';

@ApiTags('water-barrels')
@Controller('water/barrels')
export class BarrelsController {
  constructor(
    private readonly barrels: BarrelsService,
    private readonly db: WaterDbService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List water barrel assets with current responsibility.' })
  async list(@Query() query: BarrelListQueryDto) {
    const dbBarrels = await this.db.listBarrels();
    const list = dbBarrels ? { barrels: dbBarrels } : this.barrels.list();
    const records = filterRecords(list.barrels as Record<string, unknown>[], query as Record<string, unknown>);
    return waterPage(paginateRecords(records, query));
  }

  @Post()
  @ApiOperation({ summary: 'Create water barrel asset or batch.' })
  async create(@Body() dto: CreateBarrelDto) {
    return waterOk((await this.db.createBarrel(dto)) ?? this.barrels.create(dto));
  }

  @Get(':id/movements')
  @ApiOperation({ summary: 'List barrel movement ledger for one barrel.' })
  async listMovements(@Param('id') id: string, @Query() query: WaterPageQueryDto) {
    const dbMovements = await this.db.listBarrelMovements(id);
    const list = dbMovements ? { movements: dbMovements } : this.barrels.list();
    const records = (list.movements as Record<string, unknown>[]).filter((movement) => movement.barrel_id === id);
    return waterPage(paginateRecords(records, query));
  }

  @Post(':id/movements')
  @ApiOperation({ summary: 'Move water barrel asset and update responsibility with audit trail.' })
  async createMovement(@Param('id') id: string, @Body() dto: CreateBarrelMovementDto) {
    return waterOk((await this.db.moveBarrel(id, dto)) ?? this.barrels.createMovement(id, dto));
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Return an empty barrel from customer to service point, agent, or HQ.' })
  async returnBarrel(@Param('id') id: string, @Body() dto: ReturnBarrelDto) {
    return waterOk(
      (await this.db.returnBarrel(id, dto)) ??
        this.barrels.returnBarrel({
          barrelId: id,
          toHolderType: dto.to_holder_type ?? 'SERVICE_POINT',
          toHolderId: dto.to_holder_id ?? '',
          actorId: dto.created_by,
          actorRole: dto.actor_role,
          idempotencyKey: dto.idempotency_key,
          reason: dto.reason,
        }),
    );
  }

  @Post(':id/lost-or-damaged')
  @ApiOperation({ summary: 'Mark a barrel as lost or damaged with responsibility trace.' })
  async lostOrDamaged(@Param('id') id: string, @Body() dto: MarkBarrelLostOrDamagedDto) {
    return waterOk(
      (await this.db.markBarrelLostOrDamaged(id, dto)) ??
        this.barrels.markLostOrDamaged({
          barrelId: id,
          status: dto.status === WaterBarrelStatus.Damaged ? WaterBarrelStatus.Damaged : WaterBarrelStatus.Lost,
          actorId: dto.created_by,
          actorRole: dto.actor_role,
          idempotencyKey: dto.idempotency_key,
          reason: dto.reason,
        }),
    );
  }
}
