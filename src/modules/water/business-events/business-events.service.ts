import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BuildWaterBusinessEventInput,
  buildWaterBusinessEvent,
  WaterBusinessEventRecord,
} from './business-event.builder';
import { WaterSyncStatus } from '../common/water.enums';
import { requireIdempotencyKey } from '../common/water-api-error';

@Injectable()
export class BusinessEventsService {
  private readonly events: WaterBusinessEventRecord[] = [];

  list(): WaterBusinessEventRecord[] {
    return this.events;
  }

  create(input: BuildWaterBusinessEventInput): WaterBusinessEventRecord {
    const event = buildWaterBusinessEvent(input);
    const existing = this.events.find((item) => item.idempotency_key === event.idempotency_key);
    if (existing) {
      return existing;
    }

    this.events.push(event);
    return event;
  }

  acknowledge(eventId: string, actorId = 'system', idempotencyKey?: string): WaterBusinessEventRecord {
    requireIdempotencyKey(idempotencyKey);
    const event = this.events.find((item) => item.event_id === eventId || item.id === eventId);
    if (!event) {
      throw new NotFoundException(`water business event ${eventId} not found`);
    }

    if (event.sync_status === WaterSyncStatus.Synced) {
      return event;
    }

    event.sync_status = WaterSyncStatus.Synced;
    event.updated_by = actorId;
    event.idempotency_key = event.idempotency_key ?? idempotencyKey ?? null;
    return event;
  }

  snapshot(): WaterBusinessEventRecord[] {
    return JSON.parse(JSON.stringify(this.events)) as WaterBusinessEventRecord[];
  }

  restore(snapshot: WaterBusinessEventRecord[]): void {
    this.events.length = 0;
    this.events.push(...(JSON.parse(JSON.stringify(snapshot)) as WaterBusinessEventRecord[]));
  }
}
