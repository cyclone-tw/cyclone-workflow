/**
 * apiFetch — 統一的前端 API client。
 *
 * 目標:消除散落在 src/components/ 的 38 處 fetch → .json() → !data.ok → throw 四步樣板,
 * 拿回型別安全,並把錯誤自動送進 logger。
 *
 * 設計決策(詳見 issues/98-codebase-health/findings.md#D3):
 *   回傳型別採 discriminated union `{ ok: true, data } | { ok: false, error }`。
 *   優點:強制 call site 檢查 ok 欄位,不會忘記處理錯誤。
 *   若未來想改成 throw 語意,請一併檢視所有 call site。
 *
 * 慣例:server 端成功回 `{ ok: true, ...payload }`,失敗回 `{ ok: false, error: '...' }`。
 *       apiFetch<T> 的 T 對應成功時整包 JSON 的形狀(含 ok 欄位)。
 */

import { logger } from './logger';

export type ApiOk<T> = { ok: true; data: T; status: number };
export type ApiErr = { ok: false; error: string; status: number };
export type ApiResult<T> = ApiOk<T> | ApiErr;

export interface ApiFetchOptions extends Omit<RequestInit, 'body' | 'headers'> {
  /** 自動 JSON.stringify。若要送 FormData / 原始 body,用 rawBody。 */
  body?: unknown;
  /** 繞過 JSON.stringify 的 body(FormData、Blob 等) */
  rawBody?: BodyInit;
  /** 自訂 header,會 merge 到預設的 Content-Type: application/json */
  headers?: Record<string, string>;
  /** log 顯示用的標籤,預設用 path */
  logLabel?: string;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiResult<T>> {
  const { body, rawBody, headers, logLabel, ...rest } = options;
  const label = logLabel ?? path;

  let res: Response;
  let json: Record<string, unknown>;

  try {
    res = await fetch(path, {
      ...rest,
      headers: rawBody
        ? headers
        : { 'Content-Type': 'application/json', ...(headers ?? {}) },
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '網路錯誤';
    logger.error(`apiFetch network failure: ${label}`, { path, message });
    return { ok: false, error: message, status: 0 };
  }

  try {
    json = await res.json();
  } catch {
    json = {};
  }

  // 核心錯誤正規化。決策記錄於 issues/98-codebase-health/findings.md#D3。
  // 目前採用最寬鬆的相容模式:同時要求 res.ok 與 json.ok,完全對齊現有 38 處 call site 的習慣。
  if (!res.ok || json.ok === false) {
    const error = typeof json.error === 'string' ? json.error : `HTTP ${res.status}`;
    logger.warn(`apiFetch !ok: ${label}`, { status: res.status, error });
    return { ok: false, error, status: res.status };
  }
  return { ok: true, data: json as T, status: res.status };
}

/**
 * 語意糖:既然多數呼叫端只在乎成功時的 data,提供一個 throw 版本。
 * 未來若希望整體切成 throw 語意,可用這個當過渡。
 */
export async function apiFetchOrThrow<T = unknown>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T> {
  const result = await apiFetch<T>(path, options);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
