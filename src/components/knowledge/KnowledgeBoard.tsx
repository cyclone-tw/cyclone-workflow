import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/useAuth';
import { timeAgo } from '@/lib/time';

// ─── Types ────────────────────────────────────────────────────────────────────

type KnowledgeCategory = 'template' | 'best-practice' | 'qa' | 'other';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  icon: string;
  contributor_id: string;
  contributor_name: string;
  contributor_avatar: string | null;
  upvotes: number;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<KnowledgeCategory, { label: string; color: string }> = {
  template: { label: '工作流模板', color: '#00F5A0' },
  'best-practice': { label: '最佳實踐', color: '#6C63FF' },
  qa: { label: '問答精華', color: '#00D9FF' },
  other: { label: '其他', color: '#9090B0' },
};

const ICON_OPTIONS = ['📘', '⚙️', '💻', '🎙️', '✍️', '🧠', '💬', '🎯', '📊', '🛠️', '✨', '🔮'];

// ─── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(10, 10, 26, 0.6)',
  border: '1px solid #2A2A4A',
  borderRadius: '0.5rem',
  padding: '0.625rem 0.875rem',
  color: '#F0F0FF',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#9090B0',
  marginBottom: '0.375rem',
  letterSpacing: '0.02em',
};

function handleFocusIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#6C63FF';
  e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)';
}

function handleFocusOut(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#2A2A4A';
  e.target.style.boxShadow = 'none';
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  entry?: KnowledgeEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

function EntryModal({ entry, onClose, onSaved }: ModalProps) {
  const isEdit = !!entry;
  const [title, setTitle] = useState(entry?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [category, setCategory] = useState<KnowledgeCategory>(entry?.category ?? 'template');
  const [icon, setIcon] = useState(entry?.icon ?? '📘');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = '請填寫標題';
    if (!content.trim()) errs.content = '請填寫內容';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/knowledge/${entry!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), content: content.trim(), category, icon }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '更新失敗');
        }
      } else {
        const res = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), content: content.trim(), category, icon }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '新增失敗');
        }
      }
      onSaved();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : (isEdit ? '更新失敗' : '新增失敗') });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(18,18,42,0.95)', backdropFilter: 'blur(16px)',
          border: '1px solid #2A2A4A', borderRadius: '1rem',
          padding: '1.75rem', width: '100%', maxWidth: '520px',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <h3 style={{ color: '#F0F0FF', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.25rem' }}>
          {isEdit ? '編輯知識' : '投稿到知識庫'}
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Icon + Title */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <label style={labelStyle}>圖示</label>
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                style={{
                  width: '3rem', height: '2.65rem', fontSize: '1.5rem',
                  background: 'rgba(10,10,26,0.6)', border: '1px solid #2A2A4A',
                  borderRadius: '0.5rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {icon}
              </button>
              {showIconPicker && (
                <div
                  style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 10,
                    background: 'rgba(18,18,42,0.98)', border: '1px solid #2A2A4A',
                    borderRadius: '0.5rem', padding: '0.5rem',
                    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.25rem',
                    marginTop: '0.25rem',
                  }}
                >
                  {ICON_OPTIONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => { setIcon(ic); setShowIconPicker(false); }}
                      style={{
                        width: '2rem', height: '2rem', fontSize: '1.1rem',
                        background: icon === ic ? 'rgba(108,99,255,0.3)' : 'transparent',
                        border: 'none', borderRadius: '0.25rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>標題 <span style={{ color: '#E94560' }}>*</span></label>
              <input
                type="text"
                placeholder="例如：n8n 自動化入門模板"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={handleFocusIn}
                onBlur={handleFocusOut}
                style={{ ...inputStyle, borderColor: errors.title ? '#E94560' : '#2A2A4A' }}
              />
              {errors.title && <p style={{ color: '#E94560', fontSize: '0.75rem', marginTop: '0.2rem' }}>{errors.title}</p>}
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>分類</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
              onFocus={handleFocusIn}
              onBlur={handleFocusOut}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {(Object.entries(CATEGORY_CONFIG) as [KnowledgeCategory, typeof CATEGORY_CONFIG[KnowledgeCategory]][]).map(([key, cfg]) => (
                <option key={key} value={key} style={{ background: '#12122A' }}>{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>內容 <span style={{ color: '#E94560' }}>*</span></label>
            <textarea
              placeholder="分享你的知識、工作流、或最佳實踐..."
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={handleFocusIn}
              onBlur={handleFocusOut}
              style={{ ...inputStyle, resize: 'vertical', borderColor: errors.content ? '#E94560' : '#2A2A4A' }}
            />
            {errors.content && <p style={{ color: '#E94560', fontSize: '0.75rem', marginTop: '0.2rem' }}>{errors.content}</p>}
          </div>

          {errors.submit && (
            <p style={{ color: '#E94560', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{errors.submit}</p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.6rem 1.25rem', background: 'transparent', border: '1px solid #2A2A4A',
                borderRadius: '0.5rem', color: '#9090B0', fontSize: '0.875rem', cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#6C63FF')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2A2A4A')}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.6rem 1.5rem',
                background: submitting ? 'rgba(108,99,255,0.4)' : 'linear-gradient(135deg, #6C63FF, #00D9FF)',
                border: 'none', borderRadius: '0.5rem', color: '#F0F0FF',
                fontSize: '0.875rem', fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? '儲存中...' : isEdit ? '儲存變更' : '投稿'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({
  entry,
  onConfirm,
  onCancel,
}: {
  entry: KnowledgeEntry;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/knowledge/${entry.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '刪除失敗');
      }
      onConfirm();
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗，請稍後再試');
      setDeleting(false);
    }
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(18,18,42,0.95)', border: '1px solid #E9456040',
          borderRadius: '1rem', padding: '1.75rem', width: '100%', maxWidth: '380px', textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>&#128465;&#65039;</div>
        <h3 style={{ color: '#F0F0FF', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
          確定要刪除「{entry.title}」嗎？
        </h3>
        <p style={{ color: '#9090B0', fontSize: '0.85rem', marginBottom: '1.5rem' }}>此操作無法復原</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.6rem 1.25rem', background: 'transparent', border: '1px solid #2A2A4A',
              borderRadius: '0.5rem', color: '#9090B0', fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '0.6rem 1.5rem',
              background: deleting ? 'rgba(233,69,96,0.4)' : '#E94560',
              border: 'none', borderRadius: '0.5rem', color: '#F0F0FF',
              fontSize: '0.875rem', fontWeight: 600,
              cursor: deleting ? 'not-allowed' : 'pointer',
            }}
          >
            {deleting ? '刪除中...' : '確認刪除'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Entry Card ────────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  canEdit,
  onEdit,
  onDelete,
}: {
  entry: KnowledgeEntry;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.other;

  return (
    <article
      style={{
        background: 'rgba(18,18,42,0.7)', backdropFilter: 'blur(12px)',
        border: '1px solid #2A2A4A', borderLeft: `4px solid ${cfg.color}`,
        borderRadius: '0.875rem',
        padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 30px ${cfg.color}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{entry.icon}</span>
          <span
            style={{
              fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '999px',
              background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30`,
            }}
          >
            {cfg.label}
          </span>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              onClick={onEdit}
              title="編輯"
              style={{
                background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)',
                borderRadius: '0.375rem', color: '#8B83FF', fontSize: '0.75rem',
                padding: '0.25rem 0.5rem', cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.1)')}
            >
              &#9998;&#65039;
            </button>
            <button
              onClick={onDelete}
              title="刪除"
              style={{
                background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.2)',
                borderRadius: '0.375rem', color: '#E94560', fontSize: '0.75rem',
                padding: '0.25rem 0.5rem', cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(233,69,96,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(233,69,96,0.1)')}
            >
              &#10005;
            </button>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 style={{ color: '#F0F0FF', fontWeight: 700, fontSize: '1rem', lineHeight: 1.4, margin: 0 }}>
        {entry.title}
      </h3>

      {/* Content */}
      <p style={{ color: '#9090B0', fontSize: '0.85rem', lineHeight: 1.6, margin: 0, flex: 1 }}>
        {entry.content}
      </p>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {entry.tags.map((tag) => (
            <span
              key={tag.id}
              style={{
                fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px',
                background: `${tag.color}15`, color: tag.color,
                border: `1px solid ${tag.color}25`,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          paddingTop: '0.5rem', borderTop: '1px solid #2A2A4A',
        }}
      >
        {entry.contributor_avatar ? (
          <img
            src={entry.contributor_avatar}
            alt=""
            style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '1rem' }}>&#129313;</span>
        )}
        <span style={{ fontSize: '0.75rem', color: '#606080' }}>
          由 <span style={{ color: '#9090B0' }}>{entry.contributor_name}</span> 貢獻
        </span>
        <span style={{ color: '#2A2A4A' }}>&#183;</span>
        <span style={{ fontSize: '0.75rem', color: '#606080' }}>{timeAgo(entry.created_at)}</span>
      </div>
    </article>
  );
}

// ─── Category Section ──────────────────────────────────────────────────────────

function CategorySection({
  categoryKey,
  entries,
  canEditMap,
  onEdit,
  onDelete,
}: {
  categoryKey: KnowledgeCategory;
  entries: KnowledgeEntry[];
  canEditMap: Record<string, boolean>;
  onEdit: (entry: KnowledgeEntry) => void;
  onDelete: (entry: KnowledgeEntry) => void;
}) {
  const cfg = CATEGORY_CONFIG[categoryKey];
  if (entries.length === 0) return null;

  return (
    <section style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <span
          style={{
            width: '4px', height: '1.5rem', borderRadius: '999px',
            background: cfg.color,
          }}
        />
        <h2 style={{ color: '#F0F0FF', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>
          {cfg.label}
        </h2>
        <span
          style={{
            fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px',
            background: `${cfg.color}15`, color: cfg.color,
            border: `1px solid ${cfg.color}20`, fontWeight: 600,
          }}
        >
          {entries.length}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1rem',
        }}
      >
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            canEdit={canEditMap[entry.id] || false}
            onEdit={() => onEdit(entry)}
            onDelete={() => onDelete(entry)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function KnowledgeBoard() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<KnowledgeCategory | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<KnowledgeEntry | null>(null);

  async function fetchEntries() {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const res = await fetch(`/api/knowledge?${params}`);
      if (!res.ok) throw new Error('載入失敗');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setLoadError(true);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEntries();
  }, [categoryFilter]);

  // Permission check: owner or admin+
  function canEdit(entry: KnowledgeEntry): boolean {
    if (!user) return false;
    if (entry.contributor_id === user.id) return true;
    return ['captain', 'tech', 'admin'].includes(user.effectiveRole);
  }

  const canEditMap: Record<string, boolean> = {};
  for (const e of entries) {
    canEditMap[e.id] = canEdit(e);
  }

  const isAdmin = user ? ['captain', 'tech', 'admin'].includes(user.effectiveRole) : false;

  // Group by category when showing all
  const categoryOrder: KnowledgeCategory[] = ['template', 'best-practice', 'qa', 'other'];
  const grouped = categoryFilter === 'all'
    ? categoryOrder.map((cat) => ({
        category: cat,
        items: entries.filter((e) => e.category === cat),
      }))
    : [{ category: categoryFilter, items: entries }];

  const categoryTabs: { key: KnowledgeCategory | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    ...categoryOrder.map((key) => ({ key, label: CATEGORY_CONFIG[key].label })),
  ];

  return (
    <div>
      {/* Top action row */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
        }}
      >
        <div style={{ fontSize: '0.875rem', color: '#9090B0' }}>
          <span style={{ color: '#00F5A0', fontWeight: 600 }}>{entries.length}</span> 筆知識
        </div>
        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.25rem',
              background: 'linear-gradient(135deg, #6C63FF, #00D9FF)',
              border: 'none', borderRadius: '0.5rem', color: '#F0F0FF',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              transition: 'opacity 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            &#9997;&#65039; 投稿到知識庫
          </button>
        )}
      </div>

      {/* Category filter tabs */}
      <div
        style={{
          background: 'rgba(18,18,42,0.7)', backdropFilter: 'blur(12px)',
          border: '1px solid #2A2A4A', borderRadius: '0.75rem',
          padding: '0.5rem', marginBottom: '1.5rem',
          display: 'flex', gap: '0.25rem', flexWrap: 'wrap',
        }}
      >
        {categoryTabs.map((tab) => {
          const cfg = tab.key !== 'all' ? CATEGORY_CONFIG[tab.key] : null;
          const active = categoryFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setCategoryFilter(tab.key)}
              style={{
                padding: '0.4rem 0.875rem', borderRadius: '0.5rem', border: 'none',
                background: active ? (cfg ? `${cfg.color}20` : 'rgba(108,99,255,0.2)') : 'transparent',
                color: active ? (cfg ? cfg.color : '#8B83FF') : '#9090B0',
                fontSize: '0.85rem', fontWeight: active ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = '#F0F0FF';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = '#9090B0';
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9090B0' }}>載入中...</div>
      ) : loadError ? (
        <div
          style={{
            textAlign: 'center', padding: '4rem 2rem',
            background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.3)',
            borderRadius: '1rem', color: '#E94560',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>&#9888;&#65039;</div>
          <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>載入失敗，請稍後再試</p>
          <button
            onClick={fetchEntries}
            style={{
              marginTop: '0.5rem', padding: '0.5rem 1.25rem',
              background: 'rgba(233,69,96,0.15)', border: '1px solid rgba(233,69,96,0.3)',
              borderRadius: '0.5rem', color: '#E94560', fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            重試
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            textAlign: 'center', padding: '4rem 2rem',
            background: 'rgba(18,18,42,0.5)', border: '1px solid #2A2A4A',
            borderRadius: '1rem', color: '#606080',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>&#128218;</div>
          <p style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>還沒有知識條目</p>
          <p style={{ fontSize: '0.85rem' }}>
            {user
              ? '點擊「投稿到知識庫」來分享你的知識！'
              : '登入後即可投稿到知識庫'}
          </p>
        </div>
      ) : (
        grouped.map(({ category, items }) =>
          items.length > 0 ? (
            <CategorySection
              key={category}
              categoryKey={category}
              entries={items}
              canEditMap={canEditMap}
              onEdit={(entry) => setEditingEntry(entry)}
              onDelete={(entry) => setDeletingEntry(entry)}
            />
          ) : null,
        )
      )}

      {/* Contribute CTA when not logged in */}
      {!authLoading && !user && (
        <div
          style={{
            position: 'relative', overflow: 'hidden', borderRadius: '1rem',
            padding: '2rem', textAlign: 'center', marginTop: '2rem',
            background: 'linear-gradient(135deg, rgba(0,217,255,0.08) 0%, rgba(108,99,255,0.08) 100%)',
            border: '1px solid rgba(108,99,255,0.2)',
          }}
        >
          <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>&#10024;</div>
          <h3 style={{ color: '#F0F0FF', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            有值得分享的知識嗎？
          </h3>
          <p style={{ color: '#9090B0', fontSize: '0.9rem', marginBottom: '1rem' }}>
            登入後即可投稿到知識庫，讓整個團隊都能受益！
          </p>
          <a
            href="/api/auth/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem', borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #6C63FF, #00D9FF)',
              color: '#F0F0FF', textDecoration: 'none',
              fontSize: '0.9rem', fontWeight: 600,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            &#128221; 登入投稿
          </a>
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <EntryModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            fetchEntries();
          }}
        />
      )}

      {/* Edit modal */}
      {editingEntry && (
        <EntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null);
            fetchEntries();
          }}
        />
      )}

      {/* Delete confirm */}
      {deletingEntry && (
        <DeleteConfirm
          entry={deletingEntry}
          onConfirm={() => {
            setDeletingEntry(null);
            fetchEntries();
          }}
          onCancel={() => setDeletingEntry(null)}
        />
      )}
    </div>
  );
}
