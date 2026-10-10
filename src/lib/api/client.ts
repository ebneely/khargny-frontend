import { fetchApi } from './transport';
import { publishSaveRead, saveReadTicket } from '../save-data';
import type { ApiErrorBody, ApiSuccess } from './types';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Thrown for any non-2xx REST response. Carries the backend's real error shape
 * (khargny-backend/src/common/filters/all-exceptions.filter.ts):
 *   { success: false, error: { code, message }, timestamp, requestId? }
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly retryAfter?: number;

  constructor(status: number, body: ApiErrorBody | null, retryAfter?: string | null) {
    super(body?.error?.message || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error?.code || 'UNKNOWN_ERROR';
    this.requestId = body?.requestId;
    if (retryAfter) {
      const seconds = Number(retryAfter);
      const delay = Number.isFinite(seconds) ? seconds : (Date.parse(retryAfter) - Date.now()) / 1000;
      if (Number.isFinite(delay)) this.retryAfter = Math.max(0, Math.ceil(delay));
    }
  }
}

interface ApiRequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | string[] | undefined | null>;
  signal?: AbortSignal;
  keepalive?: boolean;
}

function buildUrl(path: string, params?: ApiRequestOptions['params']): string {
  const url = new URL(path, 'https://api.invalid');
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
  return `${url.pathname}${url.search}`;
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
  const saveTicket = method === 'GET' ? saveReadTicket() : 0;

  const res = await fetchApi(buildUrl(path, params), {
    method,
    credentials: 'include',
    headers: { ...opts.headers, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    keepalive: opts.keepalive,
  });

  // Backend always returns a JSON envelope, success or error (§5).
  let payload: ApiSuccess<TData> | ApiErrorBody | null = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || !payload || payload.success !== true) {
    throw new ApiError(res.status, payload && payload.success === false ? payload : null, res.headers.get('Retry-After'));
  }

  if (saveTicket) publishSaveRead(path, payload.data, saveTicket);
  return payload.data;
}
