import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/useAuth';
import { timeAgo } from '@/lib/time';

// ─── Types ───────────────────────────────────────────────────────────────────

type WishCategory = 'personal' | 'feature' | 'teaching';
type WishStatus = 'pending' | 'claimed' | 'in-progress' | 'completed';

interface WishUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface WishClaimer {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: 'claimed' | 'completed';
}

interface WishComment {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
}

interface WishHistoryEntry {
  from_status: string;
  to_status: string;
  changed_by: string;
  created_at: string;
}

interface LinkedTool {
  id: number;
  name: string;
  url: string;
  contributor_id: string;
}

interface Wish {
  id: string;
  title: string;
  description: string;
  category: WishCategory;
  status: WishStatus;
  icon: string;
  points: number;
  createdAt: string;
  updatedAt: string;
  wisher: WishUser;
  claimers: WishClaimer[];
  history: WishHistoryEntry[];
  comments?: WishComment[];
  comments_count?: number;
  linked_tools?: LinkedTool[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<WishStatus, { label: string; color: string; borderColor: string; badgeBg: string; badgeText: string }> = {
  pending:     { label: '等待認領', color: '#00F5A0', borderColor: 'rgba(0,245,160,0.4)', badgeBg: 'rgba(0,245,160,0.3)', badgeText: '#00F5A0' },
  claimed:     { label: '已認領',   color: '#00D9FF', borderColor: 'rgba(0,217,255,0.4)', badgeBg: 'rgba(0,217,255,0.3)', badgeText: '#00D9FF' },
  'in-progress': { label: '進行中', color: '#6C63FF', borderColor: 'rgba(108,99,255,0.4)', badgeBg: 'rgba(108,99,255,0.3)', badgeText: '#9B93FF' },
  completed:   { label: '已完成',   color: '#00F5A0', borderColor: 'rgba(0,245,160,0.25)', badgeBg: 'rgba(0,245,160,0.15)', badgeText: '#00F5A0' },
};

const CATEGORY_CONFIG: Record<WishCategory, { label: string; color: string }> = {
  personal: { label: '個人需求', color: '#00F5A0' },
  feature:  { label: '功能建議', color: '#6C63FF' },
  teaching: { label: '教學許願', color: '#00D9FF' },
};

const ICON_OPTIONS = ['✨', '🔨', '📚', '💡', '🎯', '🚀', '🎨', '🔧', '📝', '🌟', '💬', '⚡', '🐛', '🔒', '📊', '🎮'];

const FILTER_CATEGORIES = [
  { value: '', label: '全部' },
  { value: 'personal', label: '個人需求' },
  { value: 'feature', label: '功能建議' },
  { value: 'teaching', label: '教學許願' },
];

const FILTER_STATUSES = [
  { value: '', label: '全部狀態' },
  { value: 'pending', label: '等待認領' },
  { value: 'claimed', label: '已認領' },
  { value: 'in-progress', label: '進行中' },
  { value: 'completed', label: '已完成' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const glassStyle: React.CSSProperties = {
  background: 'rgba(10, 10, 26, 0.6)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(108, 99, 255, 0.15)',
};

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

const neonBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #00F5A0, #00D9FF)',
  color: '#0A0A1A',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  borderRadius: '0.75rem',
  padding: '0.625rem 1.25rem',
  fontSize: '0.875rem',
  boxShadow: '0 4px 16px rgba(0, 245, 160, 0.25)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

function handleFocusIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#6C63FF';
  e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)';
}

function handleFocusOut(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#2A2A4A';
  e.target.style.boxShadow = 'none';
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, size = 28 }: { name: string; avatarUrl: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        fontWeight: 700,
        background: 'rgba(108,99,255,0.25)',
        color: '#B8B0FF',
        flexShrink: 0,
      }}
    >
      {getInitial(name)}
    </span>
  );
}

// ─── CreateWishModal ──────────────────────────────────────────────────────────

function CreateWishModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WishCategory>('personal');
  const [icon, setIcon] = useState('✨');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) { setError('請填寫願望標題'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), category, icon }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error || '建立失敗'); setSubmitting(false); return; }
      onCreated();
      onClose();
    } catch {
      setError('網路錯誤');
    }
    setSubmitting(false);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          ...glassStyle,
          borderRadius: '1rem',
          padding: '1.5rem',
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#F0F0FF', margin: 0 }}>許下新願望</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9090B0', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* Icon picker */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>圖示</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ICON_OPTIONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: ic === icon ? '2px solid #6C63FF' : '1px solid #2A2A4A',
                  background: ic === icon ? 'rgba(108,99,255,0.2)' : 'rgba(10,10,26,0.4)',
                  cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>類別</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['personal', 'feature', 'teaching'] as WishCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: 8, border: category === cat ? '2px solid #6C63FF' : '1px solid #2A2A4A',
                  background: category === cat ? 'rgba(108,99,255,0.2)' : 'rgba(10,10,26,0.4)',
                  color: category === cat ? '#F0F0FF' : '#9090B0', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
              >
                {CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>標題 *</label>
          <input
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="簡短描述你的願望"
            onFocus={handleFocusIn}
            onBlur={handleFocusOut}
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>描述</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="詳細說明你的需求..."
            onFocus={handleFocusIn}
            onBlur={handleFocusOut}
            maxLength={500}
          />
        </div>

        {error && <p style={{ color: '#FF6B6B', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.625rem 1rem', borderRadius: '0.75rem', border: '1px solid #2A2A4A', background: 'transparent', color: '#9090B0', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !user}
            style={{ ...neonBtnStyle, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? '建立中...' : '許願'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteConfirmModal ────────────────────────────────────────────────────────

function DeleteConfirmModal({ wish, onClose, onDeleted }: { wish: Wish; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/wishes/${wish.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) { onDeleted(); onClose(); }
    } catch { /* ignore */ }
    setDeleting(false);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ ...glassStyle, borderRadius: '1rem', padding: '1.5rem', maxWidth: 400, width: '100%' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#F0F0FF', marginBottom: '0.75rem' }}>確認刪除</h3>
        <p style={{ color: '#9090B0', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          確定要刪除「{wish.title}」嗎？此操作無法復原。
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid #2A2A4A', background: 'transparent', color: '#9090B0', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            取消
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', border: 'none', background: '#FF4D4D', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: deleting ? 0.6 : 1 }}
          >
            {deleting ? '刪除中...' : '刪除'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SubmitToolModal ───────────────────────────────────────────────────────────

function SubmitToolModal({ wishId, onClose, onSubmitted }: { wishId: string; onClose: () => void; onSubmitted: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<'agent' | 'llm' | 'productivity' | 'dev' | 'other'>('other');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim() || !url.trim()) {
      setError('請填寫工具名稱、簡介和連結');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          url: url.trim(),
          category,
          wish_id: wishId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onSubmitted();
        onClose();
      } else {
        setError(data.error || '投稿失敗');
      }
    } catch {
      setError('網路錯誤，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          ...glassStyle,
          borderRadius: '1rem',
          padding: '1.5rem',
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#F0F0FF', margin: 0 }}>🛠️ 投稿到 AI 工具箱</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9090B0', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={labelStyle}>工具名稱 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Claude Code"
              style={{ ...inputStyle, width: '100%' }}
              onFocus={handleFocusIn}
              onBlur={handleFocusOut}
            />
          </div>
          <div>
            <label style={labelStyle}>分類</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
              onFocus={handleFocusIn}
              onBlur={handleFocusOut}
            >
              <option value="agent">🤖 Agent</option>
              <option value="llm">🧠 LLM</option>
              <option value="productivity">⚡ 生產力</option>
              <option value="dev">💻 開發</option>
              <option value="other">📦 其他</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={labelStyle}>連結 *</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            style={{ ...inputStyle, width: '100%' }}
            onFocus={handleFocusIn}
            onBlur={handleFocusOut}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>簡介 *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="簡短描述這個工具的用途和特色..."
            rows={3}
            style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
            onFocus={handleFocusIn}
            onBlur={handleFocusOut}
          />
        </div>

        {error && <p style={{ color: '#FF6B6B', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.625rem 1rem', borderRadius: '0.75rem', border: '1px solid #2A2A4A', background: 'transparent', color: '#9090B0', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !user}
            style={{ ...neonBtnStyle, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? '投稿中...' : '確認投稿'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ClaimerBadge ──────────────────────────────────────────────────────────────

function ClaimerBadge({ status }: { status: 'claimed' | 'completed' }) {
  if (status === 'completed') {
    return (
      <span style={{
        fontSize: '0.6rem',
        fontWeight: 700,
        padding: '0.05rem 0.35rem',
        borderRadius: '9999px',
        background: 'rgba(255,193,7,0.2)',
        color: '#FFC107',
        border: '1px solid rgba(255,193,7,0.4)',
        whiteSpace: 'nowrap',
      }}>
        已完成
      </span>
    );
  }
  return (
    <span style={{
      fontSize: '0.6rem',
      fontWeight: 700,
      padding: '0.05rem 0.35rem',
      borderRadius: '9999px',
      background: 'rgba(0,245,160,0.15)',
      color: '#00F5A0',
      border: '1px solid rgba(0,245,160,0.3)',
      whiteSpace: 'nowrap',
    }}>
      認領中
    </span>
  );
}

// ─── WishCard ──────────────────────────────────────────────────────────────────

function WishCard({ wish, user, onRefresh, onDelete }: { wish: Wish; user: ReturnType<typeof useAuth>['user']; onRefresh: () => void; onDelete: (wish: Wish) => void }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<WishComment[]>(wish.comments || []);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [showSubmitTool, setShowSubmitTool] = useState(false);

  const cfg = STATUS_CONFIG[wish.status];
  const isCompleted = wish.status === 'completed';
  const isWisher = user?.id === wish.wisher.id;
  const isAdminUser = user && ['captain', 'tech', 'admin'].includes(user.effectiveRole);
  const isClaimer = wish.claimers.some(c => c.id === user?.id);
  const hasClaimers = wish.claimers.length > 0;
  const activeClaimers = wish.claimers.filter(c => c.status === 'claimed');

  const handleAction = async (action: string, claimerId?: string) => {
    setActionLoading(true);
    try {
      const body: Record<string, string> = { action };
      if (claimerId) body.claimer_id = claimerId;

      const res = await fetch(`/api/wishes/${wish.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) onRefresh();
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const loadComments = async () => {
    if (comments.length > 0) return;
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/wishes/${wish.id}/comments`);
      const data = await res.json();
      if (data.ok) setComments(data.comments || []);
    } catch { /* ignore */ }
    setCommentsLoading(false);
  };

  const toggleComments = () => {
    if (!commentsOpen) loadComments();
    setCommentsOpen(!commentsOpen);
  };

  const submitComment = async () => {
    if (!commentContent.trim() || !user) return;
    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/wishes/${wish.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setCommentContent('');
        if (data.comment) {
          setComments(prev => [data.comment, ...prev]);
        } else {
          const reloadRes = await fetch(`/api/wishes/${wish.id}/comments`);
          const reloadData = await reloadRes.json();
          if (reloadData.ok) setComments(reloadData.comments || []);
        }
      }
    } catch { /* ignore */ }
    setCommentSubmitting(false);
  };

  const visibleClaimers = wish.claimers.slice(0, 3);
  const hiddenClaimerCount = wish.claimers.length - 3;

  return (
    <div
      style={{
        ...glassStyle,
        borderRadius: '1rem',
        padding: '1.25rem',
        borderLeft: `3px solid ${cfg.borderColor}`,
        opacity: isCompleted ? 0.7 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 24px ${cfg.borderColor}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.25rem' }}>{wish.icon}</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
              background: cfg.badgeBg,
              color: cfg.badgeText,
              whiteSpace: 'nowrap',
            }}
          >
            {cfg.label}
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '9999px',
              background: `${(CATEGORY_CONFIG[wish.category] || CATEGORY_CONFIG.personal).color}15`,
              color: (CATEGORY_CONFIG[wish.category] || CATEGORY_CONFIG.personal).color,
              whiteSpace: 'nowrap',
            }}
          >
            {(CATEGORY_CONFIG[wish.category] || CATEGORY_CONFIG.personal).label}
          </span>
        </div>
        {(isWisher || isAdminUser) && (
          <button
            onClick={() => onDelete(wish)}
            style={{ background: 'none', border: 'none', color: '#9090B0', cursor: 'pointer', fontSize: '0.8rem', padding: 2 }}
            title="刪除"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F0F0FF', lineHeight: 1.4, margin: 0 }}>
        {wish.title}
      </h3>

      {/* Description */}
      <p style={{ fontSize: '0.85rem', color: '#9090B0', lineHeight: 1.6, margin: 0, flex: 1 }}>
        {wish.description}
      </p>

      {/* Footer: Wisher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(108,99,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#9090B0' }}>
          <Avatar name={wish.wisher.name} avatarUrl={wish.wisher.avatarUrl} size={22} />
          <span>{wish.wisher.name}</span>
        </div>
      </div>

      {/* Claimers Section */}
      {hasClaimers && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0.5rem', background: 'rgba(10,10,26,0.4)', borderRadius: '0.5rem', border: '1px solid rgba(108,99,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.7rem', color: '#606080', fontWeight: 600 }}>認領者</div>
            {isClaimer && !isCompleted && (
              <button
                onClick={() => setShowSubmitTool(true)}
                style={{
                  fontSize: '0.7rem',
                  color: '#00D9FF',
                  background: 'transparent',
                  border: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                🛠️ 投稿到工具箱
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {wish.claimers.map((claimer) => {
              const hasTool = wish.linked_tools?.some(t => t.contributor_id === claimer.id);
              return (
                <div key={claimer.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={claimer.name} avatarUrl={claimer.avatarUrl} size={24} />
                  <span style={{ fontSize: '0.8rem', color: '#F0F0FF', fontWeight: 500 }}>{claimer.name}</span>
                  <ClaimerBadge status={claimer.status} />
                  {hasTool && (
                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      padding: '0.05rem 0.35rem',
                      borderRadius: '9999px',
                      background: 'rgba(0,217,255,0.15)',
                      color: '#00D9FF',
                      border: '1px solid rgba(0,217,255,0.3)',
                      whiteSpace: 'nowrap',
                    }}>
                      已投稿
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {wish.linked_tools && wish.linked_tools.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              <div style={{ fontSize: '0.7rem', color: '#606080', fontWeight: 600 }}>關聯工具</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {wish.linked_tools.map((tool) => (
                  <a
                    key={tool.id}
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.75rem',
                      color: '#00D9FF',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    🔗 {tool.name}
                  </a>
                ))}
              </div>
            </div>
          )}
          {visibleClaimers.length < wish.claimers.length && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {visibleClaimers.map((c, i) => (
                  <div key={c.id} style={{ marginLeft: i > 0 ? -8 : 0, border: '2px solid rgba(10,10,26,0.6)', borderRadius: '50%' }}>
                    <Avatar name={c.name} avatarUrl={c.avatarUrl} size={22} />
                  </div>
                ))}
              </div>
              {hiddenClaimerCount > 0 && (
                <span style={{ fontSize: '0.7rem', color: '#9090B0', fontWeight: 500 }}>+{hiddenClaimerCount}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {user && !isCompleted && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {wish.status === 'pending' && !isWisher && !isClaimer && (
            <button
              onClick={() => handleAction('claim')}
              disabled={actionLoading}
              style={{
                ...neonBtnStyle,
                fontSize: '0.8rem',
                padding: '0.4rem 0.875rem',
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? '處理中...' : '🙋 認領'}
            </button>
          )}
          {wish.status === 'claimed' && (isClaimer || isAdminUser) && (
            <button
              onClick={() => handleAction('in-progress')}
              disabled={actionLoading}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.875rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: '#6C63FF',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? '處理中...' : '🔨 開始實作'}
            </button>
          )}
          {(wish.status === 'in-progress' || wish.status === 'claimed') && activeClaimers.length > 0 && (isWisher || isAdminUser) && (
            <button
              onClick={() => handleAction('complete')}
              disabled={actionLoading}
              style={{
                ...neonBtnStyle,
                fontSize: '0.8rem',
                padding: '0.4rem 0.875rem',
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? '處理中...' : '✅ 完成確認'}
            </button>
          )}
        </div>
      )}

      {/* Time */}
      <div style={{ fontSize: '0.7rem', color: '#606080', marginTop: -4 }}>
        {timeAgo(wish.createdAt)}
      </div>

      {/* Status History Timeline */}
      {wish.history && wish.history.length > 0 && (
        <div style={{
          marginTop: '0.25rem', padding: '0.5rem 0.625rem',
          background: 'rgba(10,10,26,0.4)', borderRadius: '0.5rem',
          border: '1px solid rgba(108,99,255,0.1)',
        }}>
          <div style={{ fontSize: '0.65rem', color: '#606080', marginBottom: '0.35rem', fontWeight: 600 }}>
            狀態歷程
          </div>
          {wish.history.map((h, i) => {
            const fromCfg = STATUS_CONFIG[h.from_status as WishStatus];
            const toCfg = STATUS_CONFIG[h.to_status as WishStatus];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.65rem', marginBottom: i < wish.history.length - 1 ? '0.25rem' : 0 }}>
                <span style={{ color: fromCfg?.badgeText || '#9090B0' }}>{fromCfg?.label || h.from_status}</span>
                <span style={{ color: '#606080' }}>→</span>
                <span style={{ color: toCfg?.badgeText || '#9090B0', fontWeight: 600 }}>{toCfg?.label || h.to_status}</span>
                <span style={{ color: '#505070', marginLeft: 'auto' }}>{timeAgo(h.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}

      {showSubmitTool && (
        <SubmitToolModal
          wishId={wish.id}
          onClose={() => setShowSubmitTool(false)}
          onSubmitted={() => { setShowSubmitTool(false); onRefresh(); }}
        />
      )}

      {/* Comments Section */}
      <div style={{ marginTop: '0.25rem' }}>
        <button
          onClick={toggleComments}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '0.5rem 0.625rem',
            background: 'rgba(10,10,26,0.3)',
            border: '1px solid rgba(108,99,255,0.1)',
            borderRadius: '0.5rem',
            color: '#9090B0',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>💬 留言 {typeof wish.comments_count === 'number' ? `(${wish.comments_count})` : `(${comments.length})`}</span>
          <span style={{ transform: commentsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
        </button>

        {commentsOpen && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: 'rgba(10,10,26,0.3)',
            borderRadius: '0.5rem',
            border: '1px solid rgba(108,99,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            {commentsLoading ? (
              <div style={{ fontSize: '0.8rem', color: '#606080' }}>載入留言中...</div>
            ) : comments.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#606080' }}>尚無留言，來發表第一則吧！</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {comments.map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Avatar name={c.author_name} avatarUrl={c.author_avatar} size={24} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F0F0FF' }}>{c.author_name}</span>
                        <span style={{ fontSize: '0.65rem', color: '#505070' }}>{timeAgo(c.created_at)}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#B8B0FF', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {c.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {user && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Avatar name={user.name} avatarUrl={user.avatar_url} size={28} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="發表留言..."
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical', fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                    onFocus={handleFocusIn}
                    onBlur={handleFocusOut}
                    maxLength={500}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={submitComment}
                      disabled={commentSubmitting || !commentContent.trim()}
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.4rem 1rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        background: commentContent.trim() ? '#6C63FF' : '#2A2A4A',
                        color: '#fff',
                        cursor: commentContent.trim() ? 'pointer' : 'not-allowed',
                        fontWeight: 600,
                        opacity: commentSubmitting ? 0.6 : 1,
                      }}
                    >
                      {commentSubmitting ? '發送中...' : '發送'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main WishBoard ──────────────────────────────────────────────────────────

export default function WishBoard() {
  const { user, loading: authLoading } = useAuth();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Wish | null>(null);

  const fetchWishes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (catFilter) params.set('category', catFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/wishes?${params.toString()}`);
      const data = await res.json();
      if (data.ok) setWishes(data.wishes);
    } catch { /* ignore */ }
    setLoading(false);
  }, [catFilter, statusFilter]);

  useEffect(() => { fetchWishes(); }, [fetchWishes]);

  const stats = {
    total: wishes.length,
    pending: wishes.filter((w) => w.status === 'pending').length,
    claimed: wishes.filter((w) => w.status === 'claimed').length,
    inProgress: wishes.filter((w) => w.status === 'in-progress').length,
    completed: wishes.filter((w) => w.status === 'completed').length,
  };

  const statItems = [
    { label: '願望總數', value: stats.total, icon: '🌳', color: '#6C63FF' },
    { label: '等待認領', value: stats.pending, icon: '✨', color: '#00F5A0' },
    { label: '進行中', value: stats.claimed + stats.inProgress, icon: '🔨', color: '#00D9FF' },
    { label: '已完成', value: stats.completed, icon: '✅', color: '#00F5A0' },
  ];

  return (
    <div>
      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        {statItems.map((s) => (
          <div
            key={s.label}
            style={{
              ...glassStyle,
              borderRadius: '0.75rem',
              padding: '1rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#9090B0', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Create Button */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
        {/* Category filter pills */}
        {FILTER_CATEGORIES.map((f) => (
          <button
            key={f.value}
            onClick={() => setCatFilter(f.value)}
            style={{
              padding: '0.375rem 0.875rem',
              borderRadius: '9999px',
              border: catFilter === f.value ? '1px solid #6C63FF' : '1px solid #2A2A4A',
              background: catFilter === f.value ? 'rgba(108,99,255,0.2)' : 'transparent',
              color: catFilter === f.value ? '#F0F0FF' : '#9090B0',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            {f.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            ...inputStyle,
            width: 'auto',
            minWidth: 120,
            fontSize: '0.8rem',
            padding: '0.375rem 0.75rem',
          }}
        >
          {FILTER_STATUSES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Create button */}
        {user && (
          <button
            onClick={() => setShowCreate(true)}
            style={neonBtnStyle}
          >
            許願
          </button>
        )}
      </div>

      {/* Wish Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9090B0' }}>載入中...</div>
      ) : wishes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌟</div>
          <p style={{ color: '#9090B0' }}>目前還沒有願望，成為第一個許願的人吧！</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {wishes.map((wish) => (
            <WishCard key={wish.id} wish={wish} user={user} onRefresh={fetchWishes} onDelete={(w) => setDeleteTarget(w)} />
          ))}
        </div>
      )}

      {/* CTA for non-logged in users */}
      {!authLoading && !user && (
        <div
          style={{
            ...glassStyle,
            borderRadius: '1rem',
            padding: '2rem',
            marginTop: '1.5rem',
            textAlign: 'center',
            border: '1px dashed rgba(0,245,160,0.3)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌠</div>
          <p style={{ color: '#F0F0FF', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.375rem' }}>有個想法需要幫忙嗎？</p>
          <p style={{ color: '#9090B0', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1rem' }}>
            登入後即可許下願望，讓團隊夥伴一起來實現。<br />每個願望都是互相成長的機會。
          </p>
          <a
            href="/api/auth/login"
            style={{
              ...neonBtnStyle,
              display: 'inline-block',
              textDecoration: 'none',
            }}
          >
            登入開始許願
          </a>
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateWishModal onClose={() => setShowCreate(false)} onCreated={fetchWishes} />}
      {deleteTarget && (
        <DeleteConfirmModal
          wish={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={fetchWishes}
        />
      )}
    </div>
  );
}
