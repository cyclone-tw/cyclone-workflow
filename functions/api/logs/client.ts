/// <reference types="@cloudflare/workers-types" />
/**
 * 接收 client 端 logger.error 送過來的記錄,倒進 Cloudflare Pages log stream。
 *
 * 不存 DB(見 issues/98-codebase-health/findings.md#D2)。未來若要儲存,
 * 先開 issue、先 backup、再加 migration、再動這邊。
 *
 * 安全性:
 *   - 4KB body 上限:避免被當無限倉儲濫用
 *   - shape 驗證:不信任 client 傳來的任何欄位,只留白名單
 *   - 不需要登入:matches the intent — anonymous error telemetry
 */

interface Env {
  // 此 endpoint 目前不用任何 env。保留 interface 以配合 PagesFunction<Env> 慣例。
}

interface ClientLogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context: Record<string, unknown>;
  timestamp: string;
  source: 'client' | 'server';
}

const ALLOWED_LEVELS = new Set(['debug', 'info', 'warn', 'error']);
const MAX_BODY_BYTES = 4_096;

function sanitize(raw: unknown): ClientLogEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.level !== 'string' || !ALLOWED_LEVELS.has(r.level)) return null;
  if (typeof r.message !== 'string') return null;
  const context = r.context && typeof r.context === 'object' ? (r.context as Record<string, unknown>) : {};
  return {
    level: r.level as ClientLogEntry['level'],
    message: r.message.slice(0, 1_000),
    context,
    timestamp: typeof r.timestamp === 'string' ? r.timestamp : new Date().toISOString(),
    source: 'client',
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ ok: false, error: 'payload too large' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let entry: ClientLogEntry | null;
  try {
    entry = sanitize(await request.json());
  } catch {
    entry = null;
  }

  if (!entry) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid log entry' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ua = request.headers.get('user-agent') ?? '';
  const ip = request.headers.get('cf-connecting-ip') ?? '';
  console.error(`[client-log ${entry.level}] ${entry.message}`, {
    ...entry.context,
    ua: ua.slice(0, 200),
    ip,
    clientTs: entry.timestamp,
  });

  return new Response(null, { status: 204 });
};
