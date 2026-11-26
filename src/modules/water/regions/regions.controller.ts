import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { paginateRecords, waterPage } from '../common/water-api-response';
import { WaterDbService } from '../common/water-db.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { RegionsService } from './regions.service';

@ApiTags('water-regions')
@Controller('water/regions')
export class RegionsController {
  constructor(
    private readonly regions: RegionsService,
    private readonly db: WaterDbService,
  ) {}

  @Get()
  async list() {
    const records = (await this.db.listRegions()) ?? this.regions.list();
    return waterPage(paginateRecords(records as Record<string, unknown>[]));
  }

  @Post()
  create(@Body() dto: CreateRegionDto) {
    return this.regions.create(dto);
  }
}
