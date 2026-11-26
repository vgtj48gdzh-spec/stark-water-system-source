import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { PageResult, WaterApiErrorBody, WaterApiResponse } from './types';
import { WaterClientError } from './types';
import { getAuthToken } from './session';

const apiBaseUrl = import.meta.env.VITE_WATER_API_BASE_URL || 'http://127.0.0.1:3001';

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function createIdempotencyKey(prefix: string): string {
  const random = crypto.getRandomValues(new Uint32Array(2)).join('');
  return `${prefix}:${Date.now()}:${random}`;
}

export async function requestData<T>(config: AxiosRequestConfig): Promise<T> {
  const payload = await requestEnvelope<T>(config);
  return payload.data as T;
}

export async function requestPage<T>(config: AxiosRequestConfig): Promise<PageResult<T>> {
  const payload = await requestEnvelope<T[]>(config);
  return {
    data: payload.data ?? [],
    meta: payload.meta,
  };
}

async function requestEnvelope<T>(config: AxiosRequestConfig): Promise<WaterApiResponse<T>> {
  try {
    const response = await http.request<WaterApiResponse<T>>({
      ...config,
      params: cleanParams(config.params),
    });
    const payload = response.data;
    if (!payload.ok) {
      throw new WaterClientError(
        payload.error ?? {
          code: 'WATER_INTERNAL_ERROR',
          message: 'Water API request failed',
          details: {},
        },
      );
    }

    return payload;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function cleanParams(params: unknown): unknown {
  if (!params || typeof params !== 'object') {
    return params;
  }

  return Object.fromEntries(
    Object.entries(params as Record<string, unknown>).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null,
    ),
  );
}

export function normalizeApiError(error: unknown): WaterClientError {
  if (error instanceof WaterClientError) {
    return error;
  }

  const axiosError = error as AxiosError<WaterApiResponse<unknown> | WaterApiErrorBody | { message?: string }>;
  const responseData = axiosError.response?.data;
  if (responseData && 'ok' in responseData && responseData.ok === false && responseData.error) {
    return new WaterClientError(responseData.error);
  }

  if (responseData && 'code' in responseData && 'message' in responseData) {
    return new WaterClientError(responseData as WaterApiErrorBody);
  }

  return new WaterClientError({
    code: axiosError.code || 'WATER_INTERNAL_ERROR',
    message: axiosError.message || 'Request failed',
    details: {},
  });
}
