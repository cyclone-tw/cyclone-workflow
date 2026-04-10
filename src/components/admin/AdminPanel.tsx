import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/useAuth';
import type { GroupRole } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SiteStats {
  totalUsers: number;
  totalCheckins: number;
  totalKnowledge: number;
  totalWishes: number;
  totalMessages: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  roles: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_BADGE_COLORS: Record<string, string> = {
  captain: '#6C63FF',
  tech: '#00D9FF',
  admin: '#00F5A0',
  member: '#E94560',
  companion: '#A78BFA',
};

const ROLE_LABELS: Record<string, string> = {
  captain: '隊長',
  tech: '技術維護',
  admin: '行政協作',
  member: '正式隊員',
  companion: '陪跑員',
};

const ROLE_LEVEL_ORDER: GroupRole[] = ['captain', 'tech', 'admin', 'member', 'companion'];

const STAT_ITEMS: { key: keyof SiteStats; label: string; icon: string }[] = [
  { key: 'totalUsers', label: '總成員數', icon: '👥' },
  { key: 'totalCheckins', label: '打卡次數', icon: '✅' },
  { key: 'totalKnowledge', label: '知識條目', icon: '📚' },
  { key: 'totalWishes', label: '願望數量', icon: '🌳' },
  { key: 'totalMessages', label: '討論留言', icon: '💬' },
];

const STAT_BORDER_COLORS: Record<string, string> = {
  totalUsers: '#6C63FF',
  totalCheckins: '#00F5A0',
  totalKnowledge: '#00D9FF',
  totalWishes: '#A78BFA',
  totalMessages: '#E94560',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminPanel() {
  const { user, loading: authLoading, login, isRole } = useAuth();
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null); // user_id being updated

  const isAdmin = isRole('admin');

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/roles'),
      ]);
      const statsData = await statsRes.json();
      const usersData = await usersRes.json();

      if (!statsData.ok) throw new Error(statsData.error || '載入統計失敗');
      if (!usersData.ok) throw new Error(usersData.error || '載入成員失敗');

      setStats(statsData.stats);
      setUsers(usersData.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  // ---------------------------------------------------------------------------
  // Role mutation
  // ---------------------------------------------------------------------------

  async function mutateRole(userId: string, role: string, action: 'add' | 'remove') {
    setUpdating(userId);
    // Optimistic update
    const prev = users;
    setUsers((us) =>
      us.map((u) => {
        if (u.id !== userId) return u;
        const roles = action === 'add'
          ? [...new Set([...u.roles, role])]
          : u.roles.filter((r) => r !== role);
        return { ...u, roles };
      }),
    );

    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role, action }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '操作失敗');
    } catch (err) {
      // Rollback
      setUsers(prev);
      setError(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setUpdating(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Auth states
  // ---------------------------------------------------------------------------

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <span className="text-5xl">🛡️</span>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          需要管理員權限
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          此頁面僅限管理員以上角色存取
        </p>
        {!user && (
          <button
            onClick={login}
            className="mt-2 px-5 py-2 rounded-lg text-sm font-medium
              bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
          >
            登入
          </button>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Filter users
  // ---------------------------------------------------------------------------

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.roles.some((r) => (ROLE_LABELS[r] ?? r).toLowerCase().includes(q))
    );
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">🛡️</span>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            管理後台
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            角色管理與站點統計
          </p>
        </div>
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: '#E9456020',
            border: '1px solid #E9456040',
            color: '#E94560',
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 underline opacity-70 hover:opacity-100"
          >
            關閉
          </button>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            站點統計
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {STAT_ITEMS.map(({ key, label, icon }) => (
              <div
                key={key}
                className="rounded-xl p-4"
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderLeftWidth: '3px',
                  borderLeftColor: STAT_BORDER_COLORS[key],
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    {label}
                  </span>
                </div>
                <p className="text-2xl font-bold" style={{ color: STAT_BORDER_COLORS[key] }}>
                  {stats[key].toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Member Management */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            成員管理
          </h2>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--color-text-muted)' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜尋成員..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg text-sm w-48
                bg-[var(--color-bg-card)] border border-[var(--color-border)]
                text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            />
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    成員
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                    Email
                  </th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    角色
                  </th>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isUpdating = updating === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-[var(--color-overlay-neutral-weak)]"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      {/* Avatar + Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: ROLE_BADGE_COLORS[u.roles[0]] || '#9090B0' }}
                            >
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {u.name}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                        {u.email}
                      </td>

                      {/* Roles */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length === 0 && (
                            <span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
                              無角色
                            </span>
                          )}
                          {u.roles.map((role) => (
                            <span
                              key={role}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: ROLE_BADGE_COLORS[role] || '#9090B0' }}
                            >
                              {ROLE_LABELS[role] || role}
                              <button
                                onClick={() => mutateRole(u.id, role, 'remove')}
                                disabled={isUpdating || (u.id === user?.id && ['captain', 'tech', 'admin'].includes(role))}
                                className="opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                                title={
                                  u.id === user?.id && ['captain', 'tech', 'admin'].includes(role)
                                    ? '不能移除自己的管理權限'
                                    : `移除 ${ROLE_LABELS[role] || role}`
                                }
                              >
                                x
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <select
                          className="text-xs px-2 py-1 rounded-lg
                            bg-[var(--color-bg-dark)] border border-[var(--color-border)]
                            text-[var(--color-text-secondary)] cursor-pointer
                            disabled:opacity-50"
                          disabled={isUpdating}
                          defaultValue=""
                          onChange={(e) => {
                            const role = e.target.value as GroupRole;
                            if (role && !u.roles.includes(role)) {
                              mutateRole(u.id, role, 'add');
                            }
                            e.target.value = '';
                          }}
                        >
                          <option value="" disabled>
                            + 新增角色
                          </option>
                          {ROLE_LEVEL_ORDER.filter((r) => !u.roles.includes(r)).map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      找不到符合的成員
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Role Legend */}
      <section
        className="rounded-xl p-5"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          角色階級說明
        </h3>
        <div className="flex flex-wrap gap-3 items-center">
          {ROLE_LEVEL_ORDER.map((role, i) => (
            <span key={role} className="flex items-center gap-1.5">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: ROLE_BADGE_COLORS[role] }}
              >
                {ROLE_LABELS[role]}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                ({role})
              </span>
              {i < ROLE_LEVEL_ORDER.length - 1 && (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  &gt;
                </span>
              )}
            </span>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
          左側為較高等級。高等級角色自動擁有低等級的所有權限。
        </p>
      </section>
    </div>
  );
}
