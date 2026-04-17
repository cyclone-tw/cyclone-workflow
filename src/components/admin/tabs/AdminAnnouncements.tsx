import { useState } from 'react';
import { Modal } from '../shared';
import AnnouncementForm from '../forms/AnnouncementForm';
import type { Announcement } from '../types';

interface Props {
  announcements: Announcement[];
  loading: boolean;
  onSave: (body: { title: string; content: string; pinned: boolean }, existing?: Announcement) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export default function AdminAnnouncements({ announcements, loading, onSave, onDelete, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; title: string; busy: boolean } | null>(null);

  const openAdd = () => { setEditing(null); setShowModal(true); };
  const openEdit = (a: Announcement) => { setEditing(a); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  return (
    <>
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            最新公告
          </h2>
          <button
            onClick={openAdd}
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
          {loading ? (
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
                      onClick={() => openEdit(a)}
                      className="p-2 rounded-lg text-xs transition-opacity hover:opacity-80"
                      style={{ background: 'var(--color-bg-dark)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                      title="編輯"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleting({ id: a.id, title: a.title, busy: false })}
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

      {/* Announcement Form Modal */}
      {showModal && (
        <Modal
          title={editing ? '編輯公告' : '新增公告'}
          onClose={closeModal}
        >
          <AnnouncementForm
            announcement={editing}
            onSubmit={async (body) => {
              await onSave(body, editing ?? undefined);
              closeModal();
              onRefresh();
            }}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {/* Announcement Delete Confirm Modal */}
      {deleting && (
        <Modal title="確認刪除公告" onClose={() => setDeleting(null)}>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            確定要刪除公告「
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {deleting.title}
            </span>
            」嗎？此操作無法撤銷。
          </p>
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
              onClick={async () => {
                setDeleting((prev) => prev ? { ...prev, busy: true } : null);
                try {
                  await onDelete(deleting.id);
                  setDeleting(null);
                  onRefresh();
                } catch (err) {
                  alert(err instanceof Error ? err.message : '刪除失敗');
                  setDeleting(null);
                }
              }}
              disabled={deleting.busy}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#E94560' }}
            >
              確認刪除
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
