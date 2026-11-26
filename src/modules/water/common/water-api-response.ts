import { randomUUID } from 'crypto';

export interface WaterApiMeta {
  requestId: string;
  timestamp: string;
  page?: number;
  pageSize?: number;
  total?: number;
}

export interface WaterPageQuery {
  page?: number | string;
  pageSize?: number | string;
}

export interface WaterPaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function waterMeta(extra: Partial<WaterApiMeta> = {}): WaterApiMeta {
  return {
    requestId: extra.requestId ?? randomUUID(),
    timestamp: extra.timestamp ?? new Date().toISOString(),
    ...extra,
  };
}

export function waterOk<T>(data: T, meta?: Partial<WaterApiMeta>) {
  return {
    ok: true,
    data,
    meta: waterMeta(meta),
  };
}

export function waterPage<T>(result: WaterPaginatedResult<T>, meta?: Partial<WaterApiMeta>) {
  return {
    ok: true,
    data: result.data,
    meta: waterMeta({
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      ...meta,
    }),
  };
}

export function waterError(code: string, message: string, details?: Record<string, unknown>) {
  return {
    ok: false,
    error: {
      code,
      message,
      details: details ?? {},
    },
    meta: waterMeta(),
  };
}

export function paginateRecords<T>(records: T[], query: WaterPageQuery = {}): WaterPaginatedResult<T> {
  const page = normalizePositiveInt(query.page, 1, 1, 10_000);
  const pageSize = normalizePositiveInt(query.pageSize, 20, 1, 100);
  const total = records.length;
  const start = (page - 1) * pageSize;
  return {
    data: records.slice(start, start + pageSize),
    page,
    pageSize,
    total,
  };
}

export function filterRecords<T extends Record<string, unknown>>(
  records: T[],
  filters: Record<string, unknown>,
): T[] {
  const ignoredFilterKeys = new Set(['page', 'pageSize', 'viewer_role', 'full_phone_grant', 'balanceGtZero']);
  return records.filter((record) =>
    Object.entries(filters).every(([field, value]) => {
      if (ignoredFilterKeys.has(field)) {
        return true;
      }

      if (value === undefined || value === null || value === '') {
        return true;
      }

      if (field.endsWith('From')) {
        const sourceField = dateSourceField(field.slice(0, -4));
        return String(record[sourceField] ?? '') >= String(value);
      }

      if (field.endsWith('To')) {
        const sourceField = dateSourceField(field.slice(0, -2));
        return String(record[sourceField] ?? '') <= String(value);
      }

      if (field === 'keyword') {
        const keyword = String(value).toLowerCase();
        return Object.values(record).some((recordValue) => String(recordValue ?? '').toLowerCase().includes(keyword));
      }

      const sourceField = snakeCase(field);
      return String(record[sourceField] ?? record[field] ?? '') === String(value);
    }),
  );
}

function normalizePositiveInt(
  value: number | string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(numeric), min), max);
}

function snakeCase(input: string): string {
  return input.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function dateSourceField(input: string): string {
  if (input === 'created') {
    return 'created_at';
  }

  if (input === 'updated') {
    return 'updated_at';
  }

  return snakeCase(input);
}
