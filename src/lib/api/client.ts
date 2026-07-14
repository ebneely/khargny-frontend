import { API_BASE_URL } from '@/lib/config';
import type { ApiErrorBody, ApiSuccess } from './types';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * Thrown for any non-2xx REST response. Carries the backend's real error shape
 * (khargny-backend/src/common/filters/all-exceptions.filter.ts):
 *   { success: false, error: { code, message }, timestamp, requestId? }
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error?.message || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error?.code || 'UNKNOWN_ERROR';
    this.requestId = body?.requestId;
  }
}

interface ApiRequestOptions {
  body?: unknown;
  params?: Record<string, string | number | boolean | string[] | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: ApiRequestOptions['params']): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, String(v));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/**
 * Typed fetch wrapper for the khargny-backend REST API.
 * Unwraps the `{ success, data, timestamp }` envelope and returns `data` directly.
 * Throws `ApiError` for any non-2xx response.
 */
export async function apiRequest<TData>(
  method: HttpMethod,
  path: string,
  opts: ApiRequestOptions = {},
): Promise<TData> {
  const { body, params, signal } = opts;

  const res = await fetch(buildUrl(path, params), {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // Backend always returns a JSON envelope, success or error (§5).
  let payload: ApiSuccess<TData> | ApiErrorBody | null = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || !payload || payload.success !== true) {
    throw new ApiError(res.status, payload && payload.success === false ? payload : null);
  }

  return payload.data;
}
