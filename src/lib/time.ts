/**
 * Parse a date string robustly.
 *
 * SQLite's `datetime('now')` (used in many DB columns) returns a naive UTC
 * string like `2026-04-11 14:30:45` with no timezone marker. JavaScript's
 * `new Date(...)` interprets such strings as *local time*, which in UTC+8
 * Taiwan creates an 8-hour drift and makes "just now" posts appear as "8
 * hours ago". Append `Z` so the string is unambiguously parsed as UTC.
 *
 * ISO 8601 strings that already carry a timezone suffix (e.g. GitHub API
 * responses ending in `Z` or `+00:00`) pass through untouched.
 */
export function parseServerDate(input: string): Date {
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(input)) return new Date(input);
  return new Date(input.replace(' ', 'T') + 'Z');
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - parseServerDate(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  if (days < 30) return `${days} 天前`;
  return parseServerDate(dateStr).toLocaleDateString('zh-TW');
}
