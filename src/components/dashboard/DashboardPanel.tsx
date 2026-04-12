import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/useAuth';
import type { GroupRole } from '@/lib/constants';
import { WEEKS } from '@/lib/constants';

interface CheckinStats {
  totalPoints: number;
  totalCheckins: number;
  currentStreak: number;
  longestStreak: number;
  lastCheckinDate: string | null;
  knowledgeCount: number;
}

const ROLE_BADGE_COLORS: Record<GroupRole, string> = {
  captain: '#6C63FF',
  tech: '#00D9FF',
  admin: '#00F5A0',
  member: '#E94560',
  companion: '#A78BFA',
};

const ROLE_LABELS: Record<GroupRole, string> = {
  captain: '隊長',
  tech: '技術維護',
  admin: '行政協作',
  member: '正式隊員',
  companion: '陪跑員',
};

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  // dateStr is "YYYY-MM-DD" local format — compare directly with today's local date
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return dateStr === `${y}-${m}-${d}`;
}

export default function DashboardPanel() {
  const { user, loading: authLoading, login } = useAuth();
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch stats when user logs in
  useEffect(() => {
    if (!user) {
      setStatsLoading(false);
      return;
    }
    let cancelled = false;
    setStatsLoading(true);
    fetch('/api/checkin/stats')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok && data.stats) {
          setStats(data.stats);
          setCheckedInToday(isToday(data.stats.lastCheckinDate));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleCheckin = useCallback(async () => {
    if (checkingIn || checkedInToday) return;
    setCheckingIn(true);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        setCheckedInToday(true);
        setToast('打卡成功！繼續保持！');
        // Re-fetch stats from server to get accurate streak after checkin
        try {
          const statsRes = await fetch('/api/checkin/stats');
          const statsData = await statsRes.json();
          if (statsData.ok && statsData.stats) {
            setStats(statsData.stats);
          } else {
            // Fallback: use streak from checkin response for optimistic update
            const newStreak = data.streak ?? 1;
            setStats((prev) => prev ? {
              ...prev,
              totalPoints: prev.totalPoints + (data.points ?? 10),
              totalCheckins: prev.totalCheckins + 1,
              currentStreak: newStreak,
              longestStreak: Math.max(prev.longestStreak, newStreak),
              lastCheckinDate: data.checkinDate ?? new Date().toISOString(),
            } : prev);
          }
        } catch {
          // Stats re-fetch failed — use data from checkin response
          const newStreak = data.streak ?? 1;
          setStats((prev) => prev ? {
            ...prev,
            totalPoints: prev.totalPoints + (data.points ?? 10),
            totalCheckins: prev.totalCheckins + 1,
            currentStreak: newStreak,
            longestStreak: Math.max(prev.longestStreak, newStreak),
            lastCheckinDate: data.checkinDate ?? new Date().toISOString(),
          } : prev);
        }
      } else {
        setToast(data.error || '打卡失敗，請稍後再試');
      }
    } catch {
      setToast('網路錯誤，請稍後再試');
    } finally {
      setCheckingIn(false);
    }
  }, [checkingIn, checkedInToday]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="mb-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-9 w-48 rounded-lg bg-[var(--color-overlay-neutral-strong)] animate-pulse mb-2" />
            <div className="h-4 w-64 rounded bg-[var(--color-overlay-neutral-strong)] animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-2xl p-5 border border-[var(--color-border)]">
              <div className="h-20 animate-pulse rounded bg-[var(--color-overlay-neutral-strong)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Not logged in — show login prompt
  if (!user) {
    return (
      <div className="mb-10">
        <div className="glass rounded-2xl border border-[var(--color-border)] p-8 sm:p-12 flex flex-col items-center text-center">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">歡迎來到共學儀表板</h1>
          <p className="text-[var(--color-text-secondary)] text-sm mb-6 max-w-md">
            登入後即可查看個人學習進度、打卡紀錄與積分。
          </p>
          <button
            onClick={login}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
              bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white
              transition-colors glow-primary"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            登入以繼續
          </button>
        </div>
      </div>
    );
  }

  // Logged-in view
  const roleColor = ROLE_BADGE_COLORS[user.effectiveRole] || '#9090B0';
  const roleLabel = ROLE_LABELS[user.effectiveRole] || user.effectiveRole;

  return (
    <div className="mb-10 space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 glass rounded-xl border border-[var(--color-neon-green)]/40 px-5 py-3 text-sm font-medium text-[var(--color-neon-green)] shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">
              歡迎回來，{user.name}！
            </h1>
            <span
              className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: roleColor }}
            >
              {roleLabel}
            </span>
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm">
            追蹤你的 AI 工作流學習進度。
          </p>
        </div>
        {/* Quick checkin */}
        <button
          onClick={handleCheckin}
          disabled={checkingIn || checkedInToday}
          className={[
            'self-start sm:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
            checkedInToday
              ? 'bg-[var(--color-neon-green)]/10 text-[var(--color-neon-green)] border border-[var(--color-neon-green)]/30 cursor-default'
              : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white glow-primary',
          ].join(' ')}
        >
          {checkedInToday ? (
            <>
              <span className="text-base">✓</span>
              今日已打卡
            </>
          ) : checkingIn ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              打卡中...
            </>
          ) : (
            <>
              <span className="text-base">🔥</span>
              今日打卡
            </>
          )}
        </button>
      </div>

      {/* Personal Stats Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass rounded-2xl p-5 border border-[var(--color-border)]">
              <div className="h-24 animate-pulse rounded bg-[var(--color-overlay-neutral-strong)]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Streak */}
          <div className="glass rounded-2xl p-5 card-hover border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🔥</span>
              <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] rounded-full px-2 py-0.5">連續</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
              {stats?.currentStreak ?? 0}
              <span className="text-[var(--color-text-muted)] text-base font-normal"> 天</span>
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">連續打卡</div>
            {stats && stats.longestStreak > 0 && (
              <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                最長 {stats.longestStreak} 天
              </div>
            )}
          </div>

          {/* Total Points */}
          <div className="glass rounded-2xl p-5 card-hover border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">⭐</span>
              <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] rounded-full px-2 py-0.5">累計</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
              {stats?.totalPoints ?? 0}
              <span className="text-[var(--color-text-muted)] text-base font-normal"> 分</span>
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">累計積分</div>
          </div>

          {/* Total Checkins */}
          <div className="glass rounded-2xl p-5 card-hover border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📅</span>
              <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] rounded-full px-2 py-0.5">累計</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
              {stats?.totalCheckins ?? 0}
              <span className="text-[var(--color-text-muted)] text-base font-normal"> 天</span>
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">打卡天數</div>
          </div>

          {/* Today Status */}
          <div className={[
            'glass rounded-2xl p-5 card-hover border transition-all',
            checkedInToday
              ? 'border-[var(--color-neon-green)]/40'
              : 'border-[var(--color-border)]',
          ].join(' ')}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{checkedInToday ? '✅' : '📋'}</span>
              <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] rounded-full px-2 py-0.5">今日</span>
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color: checkedInToday ? 'var(--color-neon-green)' : 'var(--color-text-primary)' }}>
              {checkedInToday ? '已打卡 ✓' : '尚未打卡'}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">今日狀態</div>
            {!checkedInToday && (
              <button
                onClick={handleCheckin}
                disabled={checkingIn}
                className="mt-3 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors"
              >
                {checkingIn ? '處理中...' : '→ 立即打卡'}
              </button>
            )}
          </div>

          {/* Knowledge Contributions */}
          <div className="glass rounded-2xl p-5 card-hover border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📚</span>
              <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] rounded-full px-2 py-0.5">知識</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
              {stats?.knowledgeCount ?? 0}
              <span className="text-[var(--color-text-muted)] text-base font-normal"> 筆</span>
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">知識貢獻</div>
          </div>
        </div>
      )}

      {/* Weekly Checkpoints */}
      {WEEKS.length > 0 && (
        <div className="glass rounded-2xl border border-[var(--color-border)] p-5">
          <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <span className="text-lg">📅</span> 週檢核點
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {WEEKS.filter((w) => w.num >= 1).map((week) => {
              const now = new Date();
              const start = new Date(week.start + 'T00:00:00');
              const end = new Date(week.end + 'T23:59:59');
              const isActive = now >= start && now <= end;
              const isPast = now > end;
              return (
                <div
                  key={week.num}
                  className={[
                    'rounded-xl p-4 border transition-all',
                    isActive
                      ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5'
                      : isPast
                      ? 'border-[var(--color-neon-green)]/30 bg-[var(--color-neon-green)]/5'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-surface)]/50',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">
                      W{week.num}：{week.title}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                        進行中
                      </span>
                    )}
                    {isPast && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-neon-green)]/20 text-[var(--color-neon-green)]">
                        已結束
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">{week.subtitle}</p>
                  <ul className="space-y-1">
                    {week.goals.map((goal, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <span
                          aria-hidden="true"
                          className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--color-border)]"
                        />
                        <span className="text-[var(--color-text-muted)]">{goal}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 text-[10px] text-[var(--color-text-muted)]">
                    {week.start} ~ {week.end}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
