import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/useAuth';
import type { GroupRole } from '@/lib/constants';
import AdminStats from './tabs/AdminStats';
import AdminAnalytics from './tabs/AdminAnalytics';
import AdminMessages from './tabs/AdminMessages';
import AdminReports from './tabs/AdminReports';
import AdminUsers from './tabs/AdminUsers';
import AdminPending from './tabs/AdminPending';
import AddMemberForm from './forms/AddMemberForm';
import EditMemberForm from './forms/EditMemberForm';
import AnnouncementForm from './forms/AnnouncementForm';
import type { SiteStats, Analytics, AdminMessage, AdminReport, AdminUser, RelatedCounts, Announcement } from './types';
import { ROLE_BADGE_COLORS, ROLE_LABELS, ROLE_LEVEL_ORDER, Modal } from './shared';

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
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<{ id: string; title: string; loading: boolean } | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

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
