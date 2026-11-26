import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { filterRecords, paginateRecords, waterOk, waterPage } from '../common/water-api-response';
import { WaterDbService } from '../common/water-db.service';
import { BusinessEventListQueryDto } from '../common/water-query.dto';
import { AckBusinessEventDto } from './dto/ack-business-event.dto';
import { BusinessEventsService } from './business-events.service';

@ApiTags('water-business-events')
@Controller('water/business-events')
export class BusinessEventsController {
  constructor(
    private readonly businessEvents: BusinessEventsService,
    private readonly db: WaterDbService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List water business event outbox for future HQ sync.' })
  async list(@Query() query: BusinessEventListQueryDto) {
    const records = filterRecords(
      ((await this.db.listBusinessEvents()) ?? this.businessEvents.list()) as any[],
      query as Record<string, unknown>,
    );
    return waterPage(paginateRecords(records, query));
  }

  @Post(':id/ack')
  @ApiOperation({ summary: 'Acknowledge one water business event sync with idempotency.' })
  async acknowledge(@Param('id') id: string, @Body() dto: AckBusinessEventDto) {
    return waterOk(
      (await this.db.acknowledgeBusinessEvent(id, dto)) ??
        this.businessEvents.acknowledge(id, dto.updated_by, dto.idempotency_key),
    );
  }
}
