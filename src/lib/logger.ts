/**
 * 統一的 log 介面。Client 端 error 會盡力 POST 到 /api/logs/client,
 * server 端(Cloudflare Pages Functions)則直接走 console —— Cloudflare 會
 * 把 console 輸出進它自己的 log pipeline。
 *
 * 用 context 物件而不是 printf 字串,才能在未來想做結構化查詢時不用改 call site。
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  timestamp: string;
  source: 'client' | 'server';
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function isServer(): boolean {
  return typeof window === 'undefined';
}

function shouldLog(level: LogLevel): boolean {
  const threshold: LogLevel = import.meta.env?.DEV ? 'debug' : 'info';
  return LEVEL_ORDER[level] >= LEVEL_ORDER[threshold];
}

function format(entry: LogEntry): string {
  const tag = `[${entry.level.toUpperCase()}]`;
  const ctx = Object.keys(entry.context).length > 0 ? ` ${JSON.stringify(entry.context)}` : '';
  return `${entry.timestamp} ${tag} ${entry.message}${ctx}`;
}

async function shipErrorToServer(entry: LogEntry): Promise<void> {
  if (isServer() || entry.level !== 'error') return;
  try {
    await fetch('/api/logs/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true,
    });
  } catch {
    // 故意吞:log 管道本身失敗不能拖垮應用
  }
}

function emit(level: LogLevel, message: string, context: LogContext = {}): void {
  if (!shouldLog(level)) return;
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    source: isServer() ? 'server' : 'client',
  };
  const line = format(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else if (level === 'info') console.info(line);
  else console.debug(line);
  void shipErrorToServer(entry);
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};
