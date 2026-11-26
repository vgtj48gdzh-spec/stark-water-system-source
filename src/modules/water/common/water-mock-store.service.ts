import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { WaterSyncStatus } from './water.enums';

export type WaterMockRecord = Record<string, unknown> & { id: string };

@Injectable()
export class WaterMockStoreService {
  private readonly collections = new Map<string, Map<string, WaterMockRecord>>();

  list(collection: string): WaterMockRecord[] {
    return [...this.collection(collection).values()];
  }

  find(collection: string, predicate: (record: WaterMockRecord) => boolean): WaterMockRecord | undefined {
    return this.list(collection).find(predicate);
  }

  findByField(collection: string, field: string, value: unknown): WaterMockRecord | undefined {
    return this.find(collection, (record) => record[field] === value);
  }

  listByField(collection: string, field: string, value: unknown): WaterMockRecord[] {
    return this.list(collection).filter((record) => record[field] === value);
  }

  get(collection: string, id: string): WaterMockRecord {
    const record = this.collection(collection).get(id);
    if (!record) {
      throw new NotFoundException(`${collection} ${id} not found`);
    }

    return record;
  }

  getOptional(collection: string, id: string | null | undefined): WaterMockRecord | undefined {
    if (!id) {
      return undefined;
    }

    return this.collection(collection).get(id);
  }

  create(collection: string, input: object): WaterMockRecord {
    const inputRecord = input as Record<string, unknown>;
    const now = new Date().toISOString();
    const id = String(inputRecord.id ?? randomUUID());
    const actor = String(inputRecord.created_by ?? inputRecord.updated_by ?? 'system');
    const record: WaterMockRecord = {
      ...inputRecord,
      id,
      external_id: inputRecord.external_id ?? `water_${collection}_${id.slice(0, 8)}`,
      source_system: inputRecord.source_system ?? 'water',
      sync_status: inputRecord.sync_status ?? WaterSyncStatus.Pending,
      hq_id: inputRecord.hq_id ?? null,
      sync_error: inputRecord.sync_error ?? null,
      idempotency_key: inputRecord.idempotency_key ?? null,
      company_id: inputRecord.company_id ?? null,
      region_id: inputRecord.region_id ?? null,
      created_by: actor,
      updated_by: String(inputRecord.updated_by ?? actor),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      remark: inputRecord.remark ?? null,
    };

    this.collection(collection).set(id, record);
    return record;
  }

  createIdempotent(
    collection: string,
    idempotencyKey: string | null | undefined,
    input: object,
  ): { record: WaterMockRecord; created: boolean } {
    if (idempotencyKey) {
      const existing = this.findByField(collection, 'idempotency_key', idempotencyKey);
      if (existing) {
        return { record: existing, created: false };
      }
    }

    return {
      record: this.create(collection, { ...input, idempotency_key: idempotencyKey ?? undefined }),
      created: true,
    };
  }

  update(collection: string, id: string, input: object): WaterMockRecord {
    const inputRecord = input as Record<string, unknown>;
    const current = this.get(collection, id);
    const next = {
      ...current,
      ...inputRecord,
      id,
      updated_at: new Date().toISOString(),
      updated_by: inputRecord.updated_by ?? current.updated_by ?? 'system',
    };
    this.collection(collection).set(id, next);
    return next;
  }

  assertUniqueIdempotency(collection: string, idempotencyKey: string | null | undefined): void {
    if (!idempotencyKey) {
      return;
    }

    const existing = this.findByField(collection, 'idempotency_key', idempotencyKey);
    if (existing) {
      throw new ConflictException(`${collection} idempotency_key already exists`);
    }
  }

  snapshot(): Map<string, Map<string, WaterMockRecord>> {
    const snapshot = new Map<string, Map<string, WaterMockRecord>>();
    for (const [collectionName, records] of this.collections.entries()) {
      snapshot.set(
        collectionName,
        new Map(
          [...records.entries()].map(([id, record]) => [
            id,
            JSON.parse(JSON.stringify(record)) as WaterMockRecord,
          ]),
        ),
      );
    }

    return snapshot;
  }

  restore(snapshot: Map<string, Map<string, WaterMockRecord>>): void {
    this.collections.clear();
    for (const [collectionName, records] of snapshot.entries()) {
      this.collections.set(
        collectionName,
        new Map(
          [...records.entries()].map(([id, record]) => [
            id,
            JSON.parse(JSON.stringify(record)) as WaterMockRecord,
          ]),
        ),
      );
    }
  }

  private collection(name: string): Map<string, WaterMockRecord> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }

    return this.collections.get(name)!;
  }
}
