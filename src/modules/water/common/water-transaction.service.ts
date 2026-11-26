import { Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BusinessEventsService } from '../business-events/business-events.service';
import { WaterMockStoreService } from './water-mock-store.service';

@Injectable()
export class WaterTransactionService {
  constructor(
    private readonly store: WaterMockStoreService,
    private readonly auditLogs: AuditLogsService,
    private readonly businessEvents: BusinessEventsService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  async run<T>(work: () => T | Promise<T>): Promise<T> {
    if (this.dataSource?.isInitialized) {
      return this.dataSource.transaction(async () => work());
    }

    const storeSnapshot = this.store.snapshot();
    const auditSnapshot = this.auditLogs.snapshot();
    const eventSnapshot = this.businessEvents.snapshot();

    try {
      return await work();
    } catch (error) {
      this.store.restore(storeSnapshot);
      this.auditLogs.restore(auditSnapshot);
      this.businessEvents.restore(eventSnapshot);
      throw error;
    }
  }
}
