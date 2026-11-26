import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BusinessEventsService } from '../business-events/business-events.service';
import { WaterMockStoreService } from '../common/water-mock-store.service';
import {
  WaterAuditAction,
  WaterBusinessEventType,
  WaterServicePointStatus,
} from '../common/water.enums';
import { CreateServicePointDto } from './dto/create-service-point.dto';

@Injectable()
export class ServicePointsService {
  private readonly collection = 'service_points';

  constructor(
    private readonly store: WaterMockStoreService,
    private readonly auditLogs: AuditLogsService,
    private readonly businessEvents: BusinessEventsService,
  ) {}

  list() {
    return this.store.list(this.collection);
  }

  create(dto: CreateServicePointDto) {
    const servicePoint = this.store.create(this.collection, {
      service_point_status: WaterServicePointStatus.Lead,
      incubated_by_hq: true,
      ...dto,
    });
    this.auditLogs.record({
      actorId: dto.created_by,
      action: WaterAuditAction.CreateServicePoint,
      targetType: 'water_service_point',
      targetId: servicePoint.id,
    });
    this.businessEvents.create({
      eventType: WaterBusinessEventType.ServicePointCreated,
      aggregateType: 'water_service_point',
      aggregateId: servicePoint.id,
      payload: servicePoint,
      createdBy: dto.created_by,
    });
    return servicePoint;
  }

  transfer(id: string, agentId: string, updatedBy?: string) {
    const servicePoint = this.store.update(this.collection, id, {
      agent_id: agentId,
      service_point_status: WaterServicePointStatus.Transferred,
      transfer_at: new Date().toISOString(),
      updated_by: updatedBy,
    });
    this.auditLogs.record({
      actorId: updatedBy,
      action: WaterAuditAction.TransferServicePoint,
      targetType: 'water_service_point',
      targetId: servicePoint.id,
      metadata: { transferred_to_agent_id: agentId },
    });
    this.businessEvents.create({
      eventType: WaterBusinessEventType.ServicePointTransferred,
      aggregateType: 'water_service_point',
      aggregateId: servicePoint.id,
      payload: servicePoint,
      createdBy: updatedBy,
    });
    return servicePoint;
  }
}
