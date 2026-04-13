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

interface Analytics {
  activeUsers: { value: string; sessions: string; avgSessionDuration: string; bounceRate: string };
  pageviews30d: string;
  topPages: Array<{ path: string; views: string; users: string }>;
  trafficSources: Array<{ source: string; sessions: string; users: string }>;
  error: string | null;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  discord_id: string | null;
  status: 'active' | 'pending';
  archived_at: string | null;
  updated_at: string | null;
  roles: string[];
}

interface RelatedCounts {
  checkins: number;
  wishes: number;
  knowledge: number;
  likes: number;
  sessions: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  author_id: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
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
// Modal wrapper
// ---------------------------------------------------------------------------

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-2xl leading-none opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminPanel() {
  const { user, loading: authLoading, login, isRole } = useAuth();
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<{ user: AdminUser; relatedCounts: RelatedCounts | null; loading: boolean } | null>(null);
  const [roleConfirm, setRoleConfirm] = useState<{ user: AdminUser; role: string; action: 'add' | 'remove' } | null>(null);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<{ id: string; title: string; loading: boolean } | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  const isAdmin = isRole('admin');

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    setError(null);
    try {
      const qs = includeArchived ? '?status=all&includeArchived=1' : '?status=all';
      const [statsRes, usersRes, analyticsRes, announcementsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch(`/api/admin/users${qs}`),
        fetch('/api/admin/analytics'),
        fetch('/api/admin/announcements'),
      ]);
      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const analyticsData = await analyticsRes.json();
      const announcementsData = await announcementsRes.json();

      if (!statsData.ok) throw new Error(statsData.error || '載入統計失敗');
      if (!usersData.ok) throw new Error(usersData.error || '載入成員失敗');

      setStats(statsData.stats);
      setUsers(usersData.users);
      if (analyticsData.ok) setAnalytics(analyticsData.analytics);
      if (announcementsData.ok) setAnnouncements(announcementsData.announcements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setDataLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  // ---------------------------------------------------------------------------
  // Role mutation (with confirmation)
  // ---------------------------------------------------------------------------

  async function mutateRole(userId: string, role: string, action: 'add' | 'remove') {
    setUpdating(userId);
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
      setUsers(prev);
      setError(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setUpdating(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Member mutations
  // ---------------------------------------------------------------------------

  async function createMember(body: { name: string; email: string; role: string; discord_id: string }) {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '新增失敗');
    await fetchData();
  }

  async function updateMember(
    id: string,
    body: { name?: string; email?: string; discord_id?: string },
  ) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '更新失敗');
    await fetchData();
  }

  async function previewArchive(u: AdminUser) {
    setDeleting({ user: u, relatedCounts: null, loading: true });
    try {
      const res = await fetch(`/api/admin/users/${u.id}?preview=1`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '預覽失敗');
      setDeleting({ user: u, relatedCounts: data.relatedCounts, loading: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : '預覽失敗');
      setDeleting(null);
    }
  }

  async function confirmArchive(id: string) {
    try {
      const res = await fetch(`/api/admin/users/${id}?force=1`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '封存失敗');
      setDeleting(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '封存失敗');
    }
  }

  async function approveMember(id: string) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '核可失敗');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '核可失敗');
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

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Partition users by status
  // ---------------------------------------------------------------------------

  const pendingUsers = users.filter((u) => u.status === 'pending' && !u.archived_at);
  const activeUsers = users.filter((u) => u.status === 'active' && (includeArchived || !u.archived_at));

  const filtered = activeUsers.filter((u) => {
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
            成員、角色與站點統計
          </p>
        </div>
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: '#E9456020', border: '1px solid #E9456040', color: '#E94560' }}
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

      {/* Analytics Section */}
      {analytics && !analytics.error && (
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            📊 Google Analytics（近 7 日）
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderLeftWidth: '3px', borderLeftColor: '#6C63FF' }}>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>活躍用戶</div>
              <p className="text-2xl font-bold" style={{ color: '#6C63FF' }}>{analytics.activeUsers.value}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderLeftWidth: '3px', borderLeftColor: '#00F5A0' }}>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>工作階段</div>
              <p className="text-2xl font-bold" style={{ color: '#00F5A0' }}>{analytics.activeUsers.sessions}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderLeftWidth: '3px', borderLeftColor: '#00D9FF' }}>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>平均工作階段</div>
              <p className="text-2xl font-bold" style={{ color: '#00D9FF' }}>{analytics.activeUsers.avgSessionDuration}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderLeftWidth: '3px', borderLeftColor: '#E94560' }}>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>跳出率</div>
              <p className="text-2xl font-bold" style={{ color: '#E94560' }}>{analytics.activeUsers.bounceRate}%</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>熱門頁面</div>
              <div className="space-y-1">
                {analytics.topPages.slice(0, 5).map((p) => (
                  <div key={p.path} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>{p.path}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{parseInt(p.views).toLocaleString()} 瀏覽</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>流量來源</div>
              <div className="space-y-1">
                {analytics.trafficSources.slice(0, 5).map((s) => (
                  <div key={s.source} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>{s.source}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{parseInt(s.sessions).toLocaleString()}  session</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl px-4 py-2 text-xs" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
            30 日總瀏覽量：{parseInt(analytics.pageviews30d).toLocaleString()}
          </div>
        </section>
      )}

      {analytics?.error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#E9456020', border: '1px solid #E9456040', color: '#E94560' }}>
          {analytics.error}
          <br />
          <span className="text-xs opacity-70">請確認 Google Cloud Console 已啟用 Analytics Data API，且 API Key 有該 API 的使用權限。</span>
        </div>
      )}

      {/* Announcements Management */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            最新公告
          </h2>
          <button
            onClick={() => { setEditingAnnouncement(null); setShowAnnouncementModal(true); }}
            className="text-sm px-3 py-1.5 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            + 新增公告
          </button>
        </div>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          {announcementLoading ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              載入中...
            </div>
          ) : announcements.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              還沒有公告
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 px-4 py-3"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {a.pinned && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: '#6C63FF' }}>
                          📌 置頂
                        </span>
                      )}
                      <span className="font-medium text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {a.title}
                      </span>
                    </div>
                    <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      {a.author_name} · {new Date(a.created_at).toLocaleString('zh-TW')}
                    </div>
                    <div className="text-xs line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {a.content}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingAnnouncement(a); setShowAnnouncementModal(true); }}
                      className="p-2 rounded-lg text-xs transition-opacity hover:opacity-80"
                      style={{ background: 'var(--color-bg-dark)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                      title="編輯"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeletingAnnouncement({ id: a.id, title: a.title, loading: false })}
                      className="p-2 rounded-lg text-xs transition-opacity hover:opacity-80"
                      style={{ background: '#E9456020', color: '#E94560', border: '1px solid #E9456040' }}
                      title="刪除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pending Approvals */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            待審核使用者
          </h2>
          {pendingUsers.length > 0 && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: '#E94560' }}
            >
              {pendingUsers.length}
            </span>
          )}
        </div>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          {pendingUsers.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              目前沒有待審核的使用者
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {pendingUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: '#9090B0' }}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {u.name}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {u.email || '（無 email）'}
                    </div>
                  </div>
                  <button
                    onClick={() => approveMember(u.id)}
                    disabled={updating === u.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: '#00F5A0' }}
                  >
                    核可
                  </button>
                  <button
                    onClick={() => previewArchive(u)}
                    disabled={updating === u.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: 'var(--color-bg-dark)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    拒絕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Member Management */}
      <section>
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            成員管理
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <label
              className="flex items-center gap-1.5 text-xs cursor-pointer"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />
              顯示已封存
            </label>
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
            <button
              onClick={() => setAddOpen(true)}
              className="px-3 py-2 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              + 新增成員
            </button>
          </div>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
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
                  const isArchived = !!u.archived_at;
                  return (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-[var(--color-overlay-neutral-weak)]"
                      style={{ borderBottom: '1px solid var(--color-border)', opacity: isArchived ? 0.5 : 1 }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: ROLE_BADGE_COLORS[u.roles[0]] || '#9090B0' }}
                            >
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                              {u.name}
                            </span>
                            {isArchived && (
                              <span className="text-[10px]" style={{ color: '#E94560' }}>已封存</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                        {u.email || <span className="italic opacity-60">（未設定）</span>}
                      </td>

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
                                onClick={() => setRoleConfirm({ user: u, role, action: 'remove' })}
                                disabled={isUpdating || isArchived || (u.id === user?.id && ['captain', 'tech', 'admin'].includes(role))}
                                className="opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                                title={
                                  u.id === user?.id && ['captain', 'tech', 'admin'].includes(role)
                                    ? '不能移除自己的管理權限'
                                    : `移除 ${ROLE_LABELS[role] || role}`
                                }
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <select
                            className="text-xs px-2 py-1 rounded-lg
                              bg-[var(--color-bg-dark)] border border-[var(--color-border)]
                              text-[var(--color-text-secondary)] cursor-pointer
                              disabled:opacity-50"
                            disabled={isUpdating || isArchived}
                            value=""
                            onChange={(e) => {
                              const role = e.target.value as GroupRole;
                              if (role && !u.roles.includes(role)) {
                                setRoleConfirm({ user: u, role, action: 'add' });
                              }
                              e.target.value = '';
                            }}
                          >
                            <option value="" disabled>+ 角色</option>
                            {ROLE_LEVEL_ORDER.filter((r) => !u.roles.includes(r)).map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setEditing(u)}
                            disabled={isUpdating || isArchived}
                            className="text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{
                              background: 'var(--color-bg-dark)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => previewArchive(u)}
                            disabled={isUpdating || isArchived || u.id === user?.id}
                            className="text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{
                              background: '#E9456020',
                              border: '1px solid #E9456040',
                              color: '#E94560',
                            }}
                            title={u.id === user?.id ? '不能封存自己' : '封存成員'}
                          >
                            封存
                          </button>
                        </div>
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
        style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
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

      {/* Add Member Modal */}
      {addOpen && (
        <Modal title="新增成員" onClose={() => setAddOpen(false)}>
          <AddMemberForm
            onSubmit={async (body) => {
              try {
                await createMember(body);
                setAddOpen(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : '新增失敗');
              }
            }}
            onCancel={() => setAddOpen(false)}
          />
        </Modal>
      )}

      {/* Edit Member Modal */}
      {editing && (
        <Modal title={`編輯：${editing.name}`} onClose={() => setEditing(null)}>
          <EditMemberForm
            user={editing}
            onSubmit={async (body) => {
              try {
                await updateMember(editing.id, body);
                setEditing(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : '更新失敗');
              }
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {/* Archive Confirm Modal */}
      {deleting && (
        <Modal title={`封存：${deleting.user.name}`} onClose={() => setDeleting(null)}>
          {deleting.loading ? (
            <div className="py-4 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              載入關聯資料...
            </div>
          ) : (
            <>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                封存後該成員會從公開列表消失，session 也會被清除。可重新設為 active 恢復。
              </p>
              {deleting.relatedCounts && (
                <div
                  className="rounded-lg p-3 mb-4 text-xs space-y-1"
                  style={{ background: 'var(--color-bg-dark)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <div>關聯資料（封存後仍保留但會被過濾）：</div>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <span>打卡：{deleting.relatedCounts.checkins}</span>
                    <span>願望：{deleting.relatedCounts.wishes}</span>
                    <span>知識：{deleting.relatedCounts.knowledge}</span>
                    <span>按讚：{deleting.relatedCounts.likes}</span>
                    <span>Session：{deleting.relatedCounts.sessions}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleting(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                  style={{
                    background: 'var(--color-bg-dark)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => confirmArchive(deleting.user.id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: '#E94560' }}
                >
                  確認封存
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Role Mutation Confirm Modal */}
      {roleConfirm && (
        <Modal
          title={roleConfirm.action === 'add' ? '確認指派角色' : '確認移除角色'}
          onClose={() => setRoleConfirm(null)}
        >
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {roleConfirm.action === 'add' ? '將指派' : '將移除'}{' '}
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {roleConfirm.user.name}
            </span>{' '}
            的{' '}
            <span
              className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: ROLE_BADGE_COLORS[roleConfirm.role] || '#9090B0' }}
            >
              {ROLE_LABELS[roleConfirm.role] || roleConfirm.role}
            </span>{' '}
            角色。
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setRoleConfirm(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                background: 'var(--color-bg-dark)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              取消
            </button>
            <button
              onClick={() => {
                const { user: u, role, action } = roleConfirm;
                setRoleConfirm(null);
                mutateRole(u.id, role, action);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              確認
            </button>
          </div>
        </Modal>
      )}

      {/* Announcement Form Modal */}
      {showAnnouncementModal && (
        <Modal
          title={editingAnnouncement ? '編輯公告' : '新增公告'}
          onClose={() => { setShowAnnouncementModal(false); setEditingAnnouncement(null); }}
        >
          <AnnouncementForm
            announcement={editingAnnouncement}
            onSubmit={async (body) => {
              const url = editingAnnouncement
                ? `/api/admin/announcements/${editingAnnouncement.id}`
                : '/api/admin/announcements';
              const method = editingAnnouncement ? 'PUT' : 'POST';
              const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
              const data = await res.json();
              if (!data.ok) throw new Error(data.error || '儲存失敗');
              setShowAnnouncementModal(false);
              setEditingAnnouncement(null);
              fetchData();
            }}
            onCancel={() => { setShowAnnouncementModal(false); setEditingAnnouncement(null); }}
          />
        </Modal>
      )}

      {/* Announcement Delete Confirm Modal */}
      {deletingAnnouncement && (
        <Modal
          title="確認刪除公告"
          onClose={() => setDeletingAnnouncement(null)}
        >
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            確定要刪除公告「
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {deletingAnnouncement.title}
            </span>
            」嗎？此操作無法撤銷。
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setDeletingAnnouncement(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                background: 'var(--color-bg-dark)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              取消
            </button>
            <button
              onClick={async () => {
                setDeletingAnnouncement(prev => prev ? { ...prev, loading: true } : null);
                try {
                  const res = await fetch(`/api/admin/announcements/${deletingAnnouncement.id}`, { method: 'DELETE' });
                  const data = await res.json();
                  if (!data.ok) throw new Error(data.error || '刪除失敗');
                  setDeletingAnnouncement(null);
                  fetchData();
                } catch (err) {
                  alert(err instanceof Error ? err.message : '刪除失敗');
                  setDeletingAnnouncement(null);
                }
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: '#E94560' }}
            >
              確認刪除
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub forms
// ---------------------------------------------------------------------------

function AddMemberForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (body: { name: string; email: string; role: string; discord_id: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<GroupRole>('member');
  const [discordId, setDiscordId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        try {
          await onSubmit({ name: name.trim(), email: email.trim(), role, discord_id: discordId.trim() });
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-3"
    >
      <FormField label="姓名 / 暱稱 *">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="form-input"
          placeholder="Cyclone"
        />
      </FormField>
      <FormField label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input"
          placeholder="member@example.com（可留空）"
        />
      </FormField>
      <FormField label="Discord ID">
        <input
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value)}
          className="form-input"
          placeholder="#1234（選填）"
        />
      </FormField>
      <FormField label="角色">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as GroupRole)}
          className="form-input"
        >
          {ROLE_LEVEL_ORDER.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </FormField>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{
            background: 'var(--color-bg-dark)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {submitting ? '新增中...' : '新增'}
        </button>
      </div>
      <FormStyles />
    </form>
  );
}

function EditMemberForm({
  user: u,
  onSubmit,
  onCancel,
}: {
  user: AdminUser;
  onSubmit: (body: { name?: string; email?: string; discord_id?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(u.name);
  const [email, setEmail] = useState(u.email);
  const [discordId, setDiscordId] = useState(u.discord_id ?? '');
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        try {
          await onSubmit({
            name: name.trim(),
            email: email.trim(),
            discord_id: discordId.trim(),
          });
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-3"
    >
      <FormField label="姓名 / 暱稱 *">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="form-input"
        />
      </FormField>
      <FormField label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input"
          placeholder="member@example.com（可留空）"
        />
      </FormField>
      <FormField label="Discord ID">
        <input
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value)}
          className="form-input"
        />
      </FormField>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{
            background: 'var(--color-bg-dark)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {submitting ? '儲存中...' : '儲存'}
        </button>
      </div>
      <FormStyles />
    </form>
  );
}

function AnnouncementForm({
  announcement,
  onSubmit,
  onCancel,
}: {
  announcement: Announcement | null;
  onSubmit: (body: { title: string; content: string; pinned: boolean }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [content, setContent] = useState(announcement?.content ?? '');
  const [pinned, setPinned] = useState(announcement?.pinned ?? false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        setSubmitting(true);
        try {
          await onSubmit({ title: title.trim(), content: content.trim(), pinned });
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-3"
    >
      <FormField label="標題 *">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="form-input"
          placeholder="公告標題"
        />
      </FormField>
      <FormField label="內容 *">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={4}
          className="form-input resize-none"
          placeholder="公告內容"
        />
      </FormField>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="w-4 h-4 accent-[#6C63FF]"
        />
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          📌 置頂公告
        </span>
      </label>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{
            background: 'var(--color-bg-dark)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting || !title.trim() || !content.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {submitting ? '儲存中...' : '儲存'}
        </button>
      </div>
      <FormStyles />
    </form>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block text-xs font-medium mb-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function FormStyles() {
  return (
    <style>{`
      .form-input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        background: var(--color-bg-dark);
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
        font-size: 0.875rem;
      }
      .form-input:focus {
        outline: 2px solid var(--color-primary);
        outline-offset: -1px;
      }
    `}</style>
  );
}
