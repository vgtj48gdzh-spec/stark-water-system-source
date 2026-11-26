import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BusinessEventsService } from '../business-events/business-events.service';
import { WaterMockStoreService } from '../common/water-mock-store.service';
import { WaterAgentStatus, WaterAuditAction, WaterBusinessEventType } from '../common/water.enums';
import { CreateAgentDto } from './dto/create-agent.dto';

@Injectable()
export class AgentsService {
  private readonly collection = 'agents';

  constructor(
    private readonly store: WaterMockStoreService,
    private readonly auditLogs: AuditLogsService,
    private readonly businessEvents: BusinessEventsService,
  ) {}

  list() {
    return this.store.list(this.collection);
  }

  create(dto: CreateAgentDto) {
    const agent = this.store.create(this.collection, {
      agent_status: WaterAgentStatus.Candidate,
      deposit_paid_amount: 0,
      ...dto,
    });
    this.auditLogs.record({
      actorId: dto.created_by,
      action: WaterAuditAction.CreateAgent,
      targetType: 'water_agent',
      targetId: agent.id,
    });
    this.businessEvents.create({
      eventType: WaterBusinessEventType.AgentCreated,
      aggregateType: 'water_agent',
      aggregateId: agent.id,
      payload: agent,
      createdBy: dto.created_by,
    });
    return agent;
  }
}
