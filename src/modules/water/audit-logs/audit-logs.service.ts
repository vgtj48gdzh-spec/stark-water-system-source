import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { WaterAuditAction, WaterRole } from '../common/water.enums';

export interface WaterAuditLogRecord {
  id: string;
  actor_id: string;
  actor_role: WaterRole;
  action: WaterAuditAction | string;
  target_type: string;
  target_id: string | null;
  metadata_json: Record<string, unknown> | null;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface RecordAuditLogInput {
  actorId?: string;
  actorRole?: WaterRole;
  action: WaterAuditAction | string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditLogsService {
  private readonly logs: WaterAuditLogRecord[] = [];

  list(): WaterAuditLogRecord[] {
    return this.logs;
  }

  record(input: RecordAuditLogInput): WaterAuditLogRecord {
    const log: WaterAuditLogRecord = {
      id: randomUUID(),
      actor_id: input.actorId ?? 'system',
      actor_role: input.actorRole ?? WaterRole.Admin,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      metadata_json: input.metadata ?? null,
      before_json: input.before ?? null,
      after_json: input.after ?? null,
      reason: input.reason ?? null,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
      created_at: new Date().toISOString(),
    };
    this.logs.push(log);
    return log;
  }

  snapshot(): WaterAuditLogRecord[] {
    return JSON.parse(JSON.stringify(this.logs)) as WaterAuditLogRecord[];
  }

  restore(snapshot: WaterAuditLogRecord[]): void {
    this.logs.length = 0;
    this.logs.push(...(JSON.parse(JSON.stringify(snapshot)) as WaterAuditLogRecord[]));
  }
}
