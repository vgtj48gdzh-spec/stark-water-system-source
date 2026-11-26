import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { paginateRecords, waterPage } from '../common/water-api-response';
import { WaterDbService } from '../common/water-db.service';
import { CreateServicePointDto } from './dto/create-service-point.dto';
import { ServicePointsService } from './service-points.service';

@ApiTags('water-service-points')
@Controller('water/service-points')
export class ServicePointsController {
  constructor(
    private readonly servicePoints: ServicePointsService,
    private readonly db: WaterDbService,
  ) {}

  @Get()
  async list() {
    const records = (await this.db.listServicePoints()) ?? this.servicePoints.list();
    return waterPage(paginateRecords(records as Record<string, unknown>[]));
  }

  @Post()
  create(@Body() dto: CreateServicePointDto) {
    return this.servicePoints.create(dto);
  }

  @Patch(':id/transfer')
  transfer(
    @Param('id') id: string,
    @Body('agent_id') agentId: string,
    @Body('updated_by') updatedBy?: string,
  ) {
    return this.servicePoints.transfer(id, agentId, updatedBy);
  }
}
