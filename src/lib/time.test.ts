// Pin the timezone to Taipei (UTC+8) BEFORE importing anything that touches
// `Date`. Without this, bun test defaults to TZ=Etc/UTC for determinism, which
// would hide the original Issue #27 bug — `new Date(naive)` happens to agree
// with `new Date(naive + 'Z')` when the runtime is already UTC. Pinning to
// Asia/Taipei makes the mutation test real: a buggy `parseServerDate` that
// uses bare `new Date(...)` will drift by -8h and trip the assertions below.
process.env.TZ = 'Asia/Taipei';

import { test, expect, describe } from 'bun:test';
import { parseServerDate, timeAgo } from './time';

// Sanity gate: if the above TZ pin stops working in a future bun release,
// every assertion below would silently pass on both good and buggy code. Fail
// loudly instead.
if (new Date().getTimezoneOffset() !== -480) {
  throw new Error(
    `time.test.ts requires TZ=Asia/Taipei (offset -480). Got offset ` +
      `${new Date().getTimezoneOffset()}. Run with \`TZ=Asia/Taipei bun test\` ` +
      'or check that the top-of-file TZ assignment still works in your bun version.',
  );
}

describe('parseServerDate — Issue #27 regression gate', () => {
  test('naive SQLite UTC string ("YYYY-MM-DD HH:MM:SS") is parsed as UTC', () => {
    // This is the exact shape SQLite's `datetime('now')` returns. Before the
    // fix, `new Date(naive)` treated it as local time (UTC+8 in Taiwan),
    // which made fresh posts look 8 hours old.
    const parsed = parseServerDate('2026-04-11 14:30:45');
    expect(parsed.toISOString()).toBe('2026-04-11T14:30:45.000Z');
  });

  test('ISO string with Z suffix passes through unchanged', () => {
    const parsed = parseServerDate('2026-04-11T14:30:45Z');
    expect(parsed.toISOString()).toBe('2026-04-11T14:30:45.000Z');
  });

  test('ISO string with positive offset is converted to UTC', () => {
    const parsed = parseServerDate('2026-04-11T22:30:45+08:00');
    expect(parsed.toISOString()).toBe('2026-04-11T14:30:45.000Z');
  });

  test('ISO string with negative offset is converted to UTC', () => {
    const parsed = parseServerDate('2026-04-11T10:30:45-04:00');
    expect(parsed.toISOString()).toBe('2026-04-11T14:30:45.000Z');
  });

  test('ISO string with milliseconds and Z is preserved', () => {
    const parsed = parseServerDate('2026-04-11T14:30:45.123Z');
    expect(parsed.toISOString()).toBe('2026-04-11T14:30:45.123Z');
  });
});

describe('timeAgo — Issue #27 regression gate', () => {
  function naiveUtcFromOffset(msAgo: number): string {
    // Build a SQLite-style naive UTC string N ms before now.
    const d = new Date(Date.now() - msAgo);
    // Equivalent to SQLite's datetime('now'): YYYY-MM-DD HH:MM:SS, no Z
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }

  test('30-second-old naive UTC timestamp → "剛剛"', () => {
    // Critical regression gate. Before the fix, in UTC+8 this would have
    // been interpreted as 8h 0m 30s old and returned "8 小時前".
    expect(timeAgo(naiveUtcFromOffset(30_000))).toBe('剛剛');
  });

  test('5-minute-old naive UTC timestamp → "5 分鐘前"', () => {
    expect(timeAgo(naiveUtcFromOffset(5 * 60_000))).toBe('5 分鐘前');
  });

  test('2-hour-old naive UTC timestamp → "2 小時前"', () => {
    expect(timeAgo(naiveUtcFromOffset(2 * 60 * 60_000))).toBe('2 小時前');
  });

  test('3-day-old naive UTC timestamp → "3 天前"', () => {
    expect(timeAgo(naiveUtcFromOffset(3 * 24 * 60 * 60_000))).toBe('3 天前');
  });

  test('ISO-with-Z input works the same as naive input', () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeAgo(iso)).toBe('5 分鐘前');
  });
});
