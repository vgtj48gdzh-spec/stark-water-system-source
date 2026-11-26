import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { filterRecords, paginateRecords, waterPage } from '../common/water-api-response';
import { WaterDbService } from '../common/water-db.service';
import { AuditLogListQueryDto } from '../common/water-query.dto';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('water-audit-logs')
@Controller('water/audit-logs')
export class AuditLogsController {
  constructor(
    private readonly auditLogs: AuditLogsService,
    private readonly db: WaterDbService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List water audit logs with actor, action, target, and time filters.' })
  async list(@Query() query: AuditLogListQueryDto) {
    const records = filterRecords(((await this.db.listAuditLogs()) ?? this.auditLogs.list()) as any[], query as Record<string, unknown>);
    return waterPage(paginateRecords(records, query));
  }
}
