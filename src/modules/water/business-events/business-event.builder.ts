import { randomUUID } from 'crypto';
import { createPayloadHash } from '../common/idempotency';
import { WaterBusinessEventType, WaterSyncStatus } from '../common/water.enums';

export interface BuildWaterBusinessEventInput {
  eventType: WaterBusinessEventType;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  eventVersion?: number;
  idempotencyKey?: string;
  occurredAt?: Date;
  createdBy?: string;
  companyId?: string | null;
  regionId?: string | null;
}

export interface WaterBusinessEventRecord {
  id: string;
  event_id: string;
  event_type: WaterBusinessEventType;
  aggregate_type: string;
  aggregate_id: string;
  payload_json: Record<string, unknown>;
  idempotency_key: string;
  event_version: number;
  occurred_at: string;
  created_at: string;
  sync_status: WaterSyncStatus;
  sync_attempts: number;
  last_sync_error: string | null;
  source_system: 'water';
  hq_id: string | null;
  company_id: string | null;
  region_id: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export function buildWaterBusinessEvent(input: BuildWaterBusinessEventInput): WaterBusinessEventRecord {
  const eventVersion = input.eventVersion ?? 1;
  const payloadHash = createPayloadHash(input.payload);
  const idempotencyKey =
    input.idempotencyKey ??
    `${input.eventType}:${input.aggregateType}:${input.aggregateId}:${eventVersion}:${payloadHash}`;
  const now = new Date();
  const occurredAt = input.occurredAt ?? now;
  const eventId = randomUUID();

  return {
    id: eventId,
    event_id: eventId,
    event_type: input.eventType,
    aggregate_type: input.aggregateType,
    aggregate_id: input.aggregateId,
    payload_json: input.payload,
    idempotency_key: idempotencyKey,
    event_version: eventVersion,
    occurred_at: occurredAt.toISOString(),
    created_at: now.toISOString(),
    sync_status: WaterSyncStatus.Pending,
    sync_attempts: 0,
    last_sync_error: null,
    source_system: 'water',
    hq_id: null,
    company_id: input.companyId ?? null,
    region_id: input.regionId ?? null,
    created_by: input.createdBy ?? null,
    updated_by: input.createdBy ?? null,
  };
}
