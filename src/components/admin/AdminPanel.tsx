import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/useAuth';
import type { GroupRole } from '@/lib/constants';
import AdminStats from './tabs/AdminStats';
import AdminAnalytics from './tabs/AdminAnalytics';
import AdminMessages from './tabs/AdminMessages';
import AdminReports from './tabs/AdminReports';
import AdminUsers from './tabs/AdminUsers';
import AdminPending from './tabs/AdminPending';
import AdminAnnouncements from './tabs/AdminAnnouncements';
import AdminModals from './AdminModals';
import type { SiteStats, Analytics, AdminMessage, AdminReport, AdminUser, RelatedCounts, Announcement } from './types';
import { ROLE_LABELS, ROLE_LEVEL_ORDER } from './shared';

// ---------------------------------------------------------------------------
// Types(共享型別已搬到 ./types.ts)
// ---------------------------------------------------------------------------

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

  // Admin Messages
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [messageAction, setMessageAction] = useState<{ id: number; loading: boolean } | null>(null);

  // Admin Reports
  const [adminReports, setAdminReports] = useState<AdminReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsOffset, setReportsOffset] = useState(0);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportAction, setReportAction] = useState<{ id: number; loading: boolean } | null>(null);

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

      // Fetch messages with current offset
      const messagesRes = await fetch('/api/admin/messages', {
        headers: { 'x-offset': String(messagesOffset) },
      });
      const messagesData = await messagesRes.json();
      if (messagesData.ok) {
        setAdminMessages((prev) =>
          messagesOffset === 0 ? messagesData.messages : [...prev, ...messagesData.messages],
        );
        setMessagesTotal(messagesData.total);
      }

      // Fetch reports
      const reportsRes = await fetch('/api/admin/reports', {
        headers: { 'x-offset': String(reportsOffset) },
      });
      const reportsData = await reportsRes.json();
      if (reportsData.ok) {
        setAdminReports((prev) =>
          reportsOffset === 0 ? reportsData.reports : [...prev, ...reportsData.reports],
        );
        setReportsTotal(reportsData.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setDataLoading(false);
    }
  }, [includeArchived, messagesOffset]);

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
    body: { name?: string; email?: string; discord_id?: string; display_name?: string; emoji?: string; color?: string; bio?: string },
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
  // Message mutations
  // ---------------------------------------------------------------------------

  async function handleDeleteMessage(id: number) {
    setMessageAction({ id, loading: true });
    try {
      const res = await fetch(`/api/admin/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delete: true }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '刪除失敗');
      // Refresh messages from offset 0
      setMessagesOffset(0);
      const messagesRes = await fetch('/api/admin/messages', {
        headers: { 'x-offset': '0' },
      });
      const messagesData = await messagesRes.json();
      if (messagesData.ok) {
        setAdminMessages(messagesData.messages);
        setMessagesTotal(messagesData.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗');
    } finally {
      setMessageAction(null);
    }
  }

  async function handleRestore(id: number) {
    setMessageAction({ id, loading: true });
    try {
      const res = await fetch(`/api/admin/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '復原失敗');
      setMessagesOffset(0);
      const messagesRes = await fetch('/api/admin/messages', {
        headers: { 'x-offset': '0' },
      });
      const messagesData = await messagesRes.json();
      if (messagesData.ok) {
        setAdminMessages(messagesData.messages);
        setMessagesTotal(messagesData.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '復原失敗');
    } finally {
      setMessageAction(null);
    }
  }

  async function handleTogglePinned(id: number, pinned: number) {
    setMessageAction({ id, loading: true });
    try {
      const res = await fetch(`/api/admin/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '操作失敗');
      setMessagesOffset(0);
      const messagesRes = await fetch('/api/admin/messages', {
        headers: { 'x-offset': '0' },
      });
      const messagesData = await messagesRes.json();
      if (messagesData.ok) {
        setAdminMessages(messagesData.messages);
        setMessagesTotal(messagesData.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setMessageAction(null);
    }
  }

  async function handleResolveReport(reportId: number) {
    setReportAction({ id: reportId, loading: true });
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '處理失敗');
      setReportsOffset(0);
      const reportsRes = await fetch('/api/admin/reports', {
        headers: { 'x-offset': '0' },
      });
      const reportsData = await reportsRes.json();
      if (reportsData.ok) {
        setAdminReports(reportsData.reports);
        setReportsTotal(reportsData.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '處理失敗');
    } finally {
      setReportAction(null);
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

      <AdminStats stats={stats} />

      <AdminAnalytics analytics={analytics} />

      <AdminAnnouncements
        announcements={announcements}
        loading={announcementLoading}
        onSave={async (body, existing) => {
          const url = existing ? `/api/admin/announcements/${existing.id}` : '/api/admin/announcements';
          const method = existing ? 'PUT' : 'POST';
          const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || '儲存失敗');
        }}
        onDelete={async (id) => {
          const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || '刪除失敗');
        }}
        onRefresh={fetchData}
      />

      <AdminPending
        pendingUsers={pendingUsers}
        updating={updating}
        onApprove={approveMember}
        onReject={previewArchive}
      />

      <AdminUsers
        filtered={filtered}
        search={search}
        onSearch={setSearch}
        includeArchived={includeArchived}
        onToggleArchived={() => setIncludeArchived((v) => !v)}
        updating={updating}
        currentUserId={user?.id}
        onAdd={() => setAddOpen(true)}
        onEdit={(u) => setEditing(u)}
        onArchive={(u) => previewArchive(u)}
        onRoleConfirm={(u, role, action) => setRoleConfirm({ user: u, role, action })}
      />

      <AdminMessages
        messages={adminMessages}
        total={messagesTotal}
        loading={messagesLoading}
        action={messageAction}
        onDelete={handleDeleteMessage}
        onRestore={handleRestore}
        onTogglePinned={handleTogglePinned}
        onLoadMore={() => setMessagesOffset((o) => o + 50)}
      />

      <AdminReports
        reports={adminReports}
        total={reportsTotal}
        loading={reportsLoading}
        action={reportAction}
        onResolve={handleResolveReport}
        onLoadMore={() => setReportsOffset((o) => o + 50)}
      />


      <AdminModals
        addOpen={addOpen}
        onCloseAdd={() => setAddOpen(false)}
        onCreateMember={createMember}
        onError={(msg) => setError(msg)}
        editing={editing}
        onCloseEdit={() => setEditing(null)}
        onUpdateMember={updateMember}
        deleting={deleting}
        onCloseDelete={() => setDeleting(null)}
        onConfirmArchive={(id) => confirmArchive(id)}
        roleConfirm={roleConfirm}
        onCloseRole={() => setRoleConfirm(null)}
        onConfirmRole={(userId, role, action) => mutateRole(userId, role, action)}
      />
    </div>
  );
}
