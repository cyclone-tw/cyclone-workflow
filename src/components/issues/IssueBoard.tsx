import { useState, useEffect } from 'react';
import { timeAgo } from '@/lib/time';
import { useAuth, type AuthUser } from '@/components/auth/useAuth';

// ─── Types ───────────────────────────────────────────────────────────────────

type IssueStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
type IssueCategory = 'bug' | 'feature' | 'improvement' | 'question';

interface Issue {
  id: number;
  title: string;
  description: string;
  author: string;
  author_tag: string;
  status: IssueStatus;
  priority: IssuePriority;
  category: IssueCategory;
  related_version?: string;
  resolved_version?: string;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: string[];
  user: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
  comments: number;
  html_url: string;
}

interface Comment {
  id: number;
  author: string;
  author_tag: string;
  content: string;
  created_at: string;
}

interface IssueDetail extends Issue {
  comments: Comment[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<IssueStatus, string> = {
  'open': 'Open',
  'in-progress': '處理中',
  'resolved': '已解決',
  'closed': '已關閉',
};

const STATUS_COLORS: Record<IssueStatus, string> = {
  'open': 'var(--color-status-open)',
  'in-progress': 'var(--color-status-in-progress)',
  'resolved': 'var(--color-status-resolved)',
  'closed': 'var(--color-status-closed)',
};

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  'bug': '🐛 Bug',
  'feature': '✨ 功能',
  'improvement': '🔧 改善',
  'question': '❓ 問題',
};

const CATEGORY_COLORS: Record<IssueCategory, { bg: string; color: string }> = {
  'bug': { bg: 'var(--color-info-accent-bg)', color: 'var(--color-info-accent-text)' },
  'feature': { bg: 'var(--color-info-neon-bg)', color: 'var(--color-info-neon-text)' },
  'improvement': { bg: 'rgba(0,217,255,0.15)', color: 'var(--color-status-in-progress)' },
  'question': { bg: 'rgba(255,195,0,0.15)', color: 'var(--color-priority-medium)' },
};

const PRIORITY_LABELS: Record<IssuePriority, string> = {
  'critical': '🔴 Critical',
  'high': '🟠 High',
  'medium': '🟡 Medium',
  'low': '⚪ Low',
};

const PRIORITY_COLORS: Record<IssuePriority, { bg: string; color: string }> = {
  'critical': { bg: 'var(--color-info-accent-bg)', color: 'var(--color-priority-critical)' },
  'high': { bg: 'rgba(255,140,0,0.2)', color: 'var(--color-priority-high)' },
  'medium': { bg: 'rgba(255,195,0,0.15)', color: 'var(--color-priority-medium)' },
  'low': { bg: 'rgba(96,96,128,0.2)', color: 'var(--color-priority-low)' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
// `timeAgo` is imported from `@/lib/time`.

// ─── Shared styles ────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: IssueStatus }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: STATUS_COLORS[status],
        flexShrink: 0,
        boxShadow: `0 0 6px ${STATUS_COLORS[status]}80`,
      }}
    />
  );
}

function CategoryBadge({ category }: { category: IssueCategory }) {
  const c = CATEGORY_COLORS[category];
  return (
    <span
      style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '0.2rem 0.55rem',
        borderRadius: '999px',
        background: c.bg,
        color: c.color,
        whiteSpace: 'nowrap',
      }}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const c = PRIORITY_COLORS[priority];
  return (
    <span
      style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '0.2rem 0.55rem',
        borderRadius: '999px',
        background: c.bg,
        color: c.color,
        whiteSpace: 'nowrap',
      }}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span
      style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.25rem 0.65rem',
        borderRadius: '999px',
        background: `${STATUS_COLORS[status]}20`,
        color: STATUS_COLORS[status],
        border: `1px solid ${STATUS_COLORS[status]}50`,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Create Issue Form ────────────────────────────────────────────────────────

interface CreateFormProps {
  onCreated: () => void;
  onCancel: () => void;
  user: AuthUser;
}

function CreateIssueForm({ onCreated, onCancel, user }: CreateFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [category, setCategory] = useState<IssueCategory>('bug');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '請填寫標題';
    if (!description.trim()) newErrors.description = '請填寫描述';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, priority, category }),
      });
      if (!res.ok) throw new Error('建立失敗');
      onCreated();
    } catch {
      setErrors({ submit: '建立失敗，請稍後再試' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'rgba(18,18,42,0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #2A2A4A',
        borderRadius: '1rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}
    >
      <h3 style={{ color: '#F0F0FF', fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>
        建立新 Issue
        <span className="ml-2 text-xs font-normal" style={{ color: '#9090B0' }}>
          以 {user.display_name || user.name} 發表
        </span>
      </h3>

      {/* Title */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>標題 <span style={{ color: '#E94560' }}>*</span></label>
        <input
          type="text"
          placeholder="簡短描述這個 Issue"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onFocus={handleFocusIn}
          onBlur={handleFocusOut}
          style={{ ...inputStyle, borderColor: errors.title ? '#E94560' : '#2A2A4A' }}
        />
        {errors.title && <p style={{ color: '#E94560', fontSize: '0.75rem', marginTop: '0.2rem' }}>{errors.title}</p>}
      </div>

      {/* Description */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>描述 <span style={{ color: '#E94560' }}>*</span></label>
        <textarea
          placeholder="詳細說明問題、功能需求或建議..."
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
          onFocus={handleFocusIn}
          onBlur={handleFocusOut}
          style={{ ...inputStyle, resize: 'vertical', borderColor: errors.description ? '#E94560' : '#2A2A4A' }}
        />
        {errors.description && <p style={{ color: '#E94560', fontSize: '0.75rem', marginTop: '0.2rem' }}>{errors.description}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Category */}
        <div>
          <label style={labelStyle}>類別</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as IssueCategory)}
            onFocus={handleFocusIn}
            onBlur={handleFocusOut}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="bug" style={{ background: '#12122A' }}>🐛 Bug</option>
            <option value="feature" style={{ background: '#12122A' }}>✨ 功能建議</option>
            <option value="improvement" style={{ background: '#12122A' }}>🔧 改善</option>
            <option value="question" style={{ background: '#12122A' }}>❓ 問題</option>
          </select>
        </div>
        {/* Priority */}
        <div>
          <label style={labelStyle}>優先度</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as IssuePriority)}
            onFocus={handleFocusIn}
            onBlur={handleFocusOut}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="low" style={{ background: '#12122A' }}>⚪ Low</option>
            <option value="medium" style={{ background: '#12122A' }}>🟡 Medium</option>
            <option value="high" style={{ background: '#12122A' }}>🟠 High</option>
            <option value="critical" style={{ background: '#12122A' }}>🔴 Critical</option>
          </select>
        </div>
      </div>

      {errors.submit && (
        <p style={{ color: '#E94560', fontSize: '0.8rem', marginBottom: '1rem' }}>{errors.submit}</p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.6rem 1.25rem',
            background: 'transparent',
            border: '1px solid #2A2A4A',
            borderRadius: '0.5rem',
            color: '#9090B0',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#6C63FF')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#2A2A4A')}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '0.6rem 1.5rem',
            background: submitting ? 'rgba(108,99,255,0.4)' : 'linear-gradient(135deg, #6C63FF, #E94560)',
            border: 'none',
            borderRadius: '0.5rem',
            color: '#F0F0FF',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s, transform 0.2s',
          }}
          onMouseEnter={e => { if (!submitting) e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          {submitting ? '建立中…' : '建立 Issue'}
        </button>
      </div>
    </form>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

interface DetailViewProps {
  issueId: number;
  onBack: () => void;
}

function DetailView({ issueId, onBack }: DetailViewProps) {
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState(false);
  const { user, loading: authLoading, login } = useAuth();

  async function fetchIssue() {
    setLoading(true);
    try {
      const res = await fetch(`/api/issues/${issueId}`);
      if (!res.ok) throw new Error('載入失敗');
      const data = await res.json();
      setIssue(data.issue ? { ...data.issue, comments: data.comments || [] } : null);
    } catch {
      setIssue(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchIssue(); }, [issueId]);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!commentContent.trim()) errs.content = '請填寫留言內容';
    setCommentErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent }),
      });
      if (!res.ok) throw new Error('留言失敗');
      setCommentContent('');
      setCommentErrors({});
      await fetchIssue();
    } catch {
      setCommentErrors({ submit: '留言失敗，請稍後再試' });
    } finally {
      setSubmittingComment(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(18,18,42,0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid #2A2A4A',
    borderRadius: '1rem',
    padding: '1.5rem',
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#9090B0' }}>
        載入中…
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#9090B0' }}>
        <p>載入失敗，請稍後再試</p>
        <button onClick={onBack} style={{ marginTop: '1rem', color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
          ← 返回列表
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: '#9090B0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.875rem',
          marginBottom: '1.25rem',
          padding: 0,
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#6C63FF'}
        onMouseLeave={e => e.currentTarget.style.color = '#9090B0'}
      >
        ← 返回列表
      </button>

      {/* Issue header card */}
      <div style={{ ...cardStyle, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem', alignItems: 'center' }}>
          <StatusBadge status={issue.status} />
          <CategoryBadge category={issue.category} />
          <PriorityBadge priority={issue.priority} />
        </div>

        <h2 style={{ color: '#F0F0FF', fontWeight: 700, fontSize: '1.3rem', margin: '0 0 1rem', lineHeight: 1.4 }}>
          {issue.title}
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.8rem', color: '#9090B0' }}>
          <span>👤 <strong style={{ color: '#F0F0FF' }}>{issue.author}</strong>{issue.author_tag && <span style={{ color: '#606080' }}> {issue.author_tag}</span>}</span>
          <span>📅 建立於 {timeAgo(issue.created_at)}</span>
          {issue.updated_at !== issue.created_at && (
            <span>🔄 更新於 {timeAgo(issue.updated_at)}</span>
          )}
        </div>
      </div>

      {/* Description */}
      <div style={{ ...cardStyle, marginBottom: '1rem' }}>
        <h3 style={{ color: '#9090B0', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>
          描述
        </h3>
        <p style={{ color: '#F0F0FF', fontSize: '0.95rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
          {issue.description}
        </p>

        {issue.resolved_version && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #2A2A4A' }}>
            <span style={{ color: '#9090B0', fontSize: '0.85rem' }}>已在版本 </span>
            <a
              href="/changelog"
              style={{
                display: 'inline-block',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: '0.375rem',
                background: 'rgba(108,99,255,0.15)',
                color: '#8B83FF',
                border: '1px solid rgba(108,99,255,0.3)',
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(108,99,255,0.15)'}
            >
              {issue.resolved_version}
            </a>
            <span style={{ color: '#9090B0', fontSize: '0.85rem' }}> 修復</span>
          </div>
        )}
      </div>

      {/* Comments */}
      <div style={{ ...cardStyle, marginBottom: '1rem' }}>
        <h3 style={{ color: '#9090B0', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          留言 ({issue.comments?.length ?? 0})
        </h3>

        {(!issue.comments || issue.comments.length === 0) ? (
          <p style={{ color: '#606080', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0' }}>
            還沒有留言，來第一個留言吧！
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {issue.comments.map(comment => (
              <div
                key={comment.id}
                style={{
                  padding: '1rem',
                  background: 'rgba(10,10,26,0.4)',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(42,42,74,0.6)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                  <span style={{ color: '#F0F0FF', fontWeight: 600, fontSize: '0.875rem' }}>
                    {comment.author}
                    {comment.author_tag && <span style={{ color: '#606080', fontWeight: 400, marginLeft: '0.3rem' }}>{comment.author_tag}</span>}
                  </span>
                  <span style={{ color: '#606080', fontSize: '0.75rem' }}>{timeAgo(comment.created_at)}</span>
                </div>
                <p style={{ color: '#C0C0D8', fontSize: '0.9rem', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add comment form */}
      {!authLoading && !user ? (
        <div
          className="rounded-xl p-5 flex flex-col items-center gap-3 text-center"
          style={cardStyle}
        >
          <p className="text-2xl">💬</p>
          <p className="text-sm font-medium" style={{ color: '#F0F0FF' }}>
            登入後即可留言
          </p>
          <p className="text-xs" style={{ color: '#9090B0' }}>
            已有帳號的隊員才能發表留言
          </p>
          <button
            onClick={login}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: '#6C63FF', color: '#fff' }}
          >
            🔐 登入
          </button>
        </div>
      ) : !authLoading && user ? (
        <div style={cardStyle}>
          <h3 style={{ color: '#9090B0', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            新增留言
            <span className="ml-2 text-xs font-normal" style={{ color: '#9090B0' }}>
              以 {user.display_name || user.name} 發表
            </span>
          </h3>
          <form onSubmit={handleAddComment}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>留言內容 <span style={{ color: '#E94560' }}>*</span></label>
              <textarea
                placeholder="輸入留言…"
                rows={3}
                value={commentContent}
                onChange={e => setCommentContent(e.target.value)}
                onFocus={handleFocusIn}
                onBlur={handleFocusOut}
                style={{ ...inputStyle, resize: 'vertical', borderColor: commentErrors.content ? '#E94560' : '#2A2A4A' }}
              />
              {commentErrors.content && <p style={{ color: '#E94560', fontSize: '0.75rem', marginTop: '0.2rem' }}>{commentErrors.content}</p>}
            </div>
            {commentErrors.submit && <p style={{ color: '#E94560', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{commentErrors.submit}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submittingComment}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: submittingComment ? 'rgba(108,99,255,0.4)' : 'linear-gradient(135deg, #6C63FF, #E94560)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#F0F0FF',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: submittingComment ? 'not-allowed' : 'pointer',
                }}
              >
                {submittingComment ? '送出中…' : '送出留言'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

// ─── GitHub Label Colors ──────────────────────────────────────────────────────

const GITHUB_LABEL_COLORS: Record<string, { bg: string; color: string }> = {
  bug: { bg: 'rgba(255,0,0,0.15)', color: '#ff6666' },
  feature: { bg: 'rgba(0,255,160,0.12)', color: '#00F5A0' },
  enhancement: { bg: 'rgba(108,99,255,0.15)', color: '#8B83FF' },
  documentation: { bg: 'rgba(0,217,255,0.12)', color: '#00D9FF' },
  'good first issue': { bg: 'rgba(0,255,160,0.12)', color: '#00F5A0' },
  help: { bg: 'rgba(255,195,0,0.15)', color: '#FFC300' },
  question: { bg: 'rgba(255,195,0,0.15)', color: '#FFC300' },
  wontfix: { bg: 'rgba(96,96,128,0.2)', color: '#606080' },
};

function getGitHubLabelStyle(label: string): { bg: string; color: string } {
  const lower = label.toLowerCase();
  return GITHUB_LABEL_COLORS[lower] ?? { bg: 'rgba(108,99,255,0.12)', color: '#A0A0C8' };
}

// ─── GitHub Issues Tab ────────────────────────────────────────────────────────

function GitHubIssuesTab() {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGitHub() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/github/issues');
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          const serverError = data?.error ?? `HTTP ${res.status}`;
          console.error('GitHub Issues fetch failed:', serverError);
          if (res.status === 403 || /rate limit/i.test(String(serverError))) {
            setError('GitHub API 限流中，請稍後再試（或請管理員設定 GITHUB_TOKEN）');
          } else {
            setError(`無法載入 GitHub Issues：${serverError}`);
          }
          setIssues([]);
          return;
        }
        setIssues(data.issues || []);
      } catch (err) {
        console.error('GitHub Issues fetch error:', err);
        setError('無法載入 GitHub Issues，請稍後再試');
        setIssues([]);
      } finally {
        setLoading(false);
      }
    }
    fetchGitHub();
  }, []);

  const repoIssuesUrl = 'https://github.com/cyclone-tw/cyclone-workflow/issues';

  const fallbackLink = (
    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
      <a
        href={repoIssuesUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: '#8B83FF',
          fontSize: '0.85rem',
          fontWeight: 600,
          textDecoration: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid rgba(108,99,255,0.3)',
          background: 'rgba(108,99,255,0.08)',
        }}
      >
        前往 GitHub 儲存庫 →
      </a>
    </div>
  );

  const cardBase: React.CSSProperties = {
    background: 'rgba(18,18,42,0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid #2A2A4A',
    borderRadius: '0.75rem',
    padding: '1rem 1.25rem',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(18,18,42,0.5)',
              border: '1px solid #2A2A4A',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(42,42,74,0.6)' }} />
              <div style={{ width: '80px', height: '12px', borderRadius: '4px', background: 'rgba(42,42,74,0.6)' }} />
              <div style={{ width: '60%', height: '14px', borderRadius: '4px', background: 'rgba(42,42,74,0.6)' }} />
            </div>
            <div style={{ width: '40%', height: '10px', borderRadius: '4px', background: 'rgba(42,42,74,0.4)' }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(18,18,42,0.5)',
            border: '1px solid #2A2A4A',
            borderRadius: '1rem',
            color: '#9090B0',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
          <p style={{ fontSize: '0.95rem' }}>{error}</p>
        </div>
        {fallbackLink}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div>
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(18,18,42,0.5)',
            border: '1px solid #2A2A4A',
            borderRadius: '1rem',
            color: '#606080',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
          <p style={{ fontSize: '0.95rem' }}>目前沒有 Open 的 GitHub Issues</p>
        </div>
        {fallbackLink}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {issues.map((issue) => (
          <div
            key={issue.id}
            onClick={() => window.open(issue.html_url, '_blank', 'noopener')}
            style={cardBase}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(26,26,62,0.8)';
              e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(18,18,42,0.7)';
              e.currentTarget.style.borderColor = '#2A2A4A';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
              {/* Author avatar */}
              {issue.avatar_url && (
                <img
                  src={issue.avatar_url}
                  alt={issue.user}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: '0.1rem',
                    border: '1px solid #2A2A4A',
                  }}
                />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Title row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#606080', fontSize: '0.8rem', fontWeight: 600 }}>#{issue.number}</span>
                  <span style={{ color: '#F0F0FF', fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.4 }}>
                    {issue.title}
                  </span>
                </div>

                {/* Labels */}
                {issue.labels.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.4rem' }}>
                    {issue.labels.map((label) => {
                      const style = getGitHubLabelStyle(label);
                      return (
                        <span
                          key={label}
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            background: style.bg,
                            color: style.color,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Meta row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: '#606080', alignItems: 'center' }}>
                  <span>{issue.user}</span>
                  <span>{timeAgo(issue.created_at)}</span>
                </div>
              </div>

              {/* Comment count */}
              {issue.comments > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    color: '#606080',
                    fontSize: '0.8rem',
                    flexShrink: 0,
                    marginTop: '0.15rem',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {issue.comments}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Link to create new GitHub issue */}
      <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
        <a
          href="https://github.com/cyclone-tw/cyclone-workflow/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#8B83FF',
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(108,99,255,0.3)',
            background: 'rgba(108,99,255,0.08)',
            transition: 'background 0.2s, border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(108,99,255,0.15)';
            e.currentTarget.style.borderColor = 'rgba(108,99,255,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(108,99,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          前往 GitHub 建立 Issue →
        </a>
      </div>
    </div>
  );
}

// ─── Main IssueBoard ──────────────────────────────────────────────────────────

type SourceTab = 'local' | 'github';

export default function IssueBoard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | 'all'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [sourceTab, setSourceTab] = useState<SourceTab>('local');
  const { user, loading: authLoading, login } = useAuth();

  async function fetchIssues() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const res = await fetch(`/api/issues?${params}`);
      if (!res.ok) throw new Error('載入失敗');
      const data = await res.json();
      setIssues(data.issues || []);
    } catch {
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchIssues(); }, [statusFilter, categoryFilter]);

  // If detail view is active
  if (selectedIssueId !== null) {
    return (
      <DetailView
        issueId={selectedIssueId}
        onBack={() => setSelectedIssueId(null)}
      />
    );
  }

  // Stats counts (from current fetched list; fetch all for accurate counts)
  const openCount = issues.filter(i => i.status === 'open').length;
  const inProgressCount = issues.filter(i => i.status === 'in-progress').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const closedCount = issues.filter(i => i.status === 'closed').length;
  const notClosedCount = openCount + inProgressCount + resolvedCount;

  const statusTabs: { key: IssueStatus | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'open', label: 'Open' },
    { key: 'in-progress', label: '處理中' },
    { key: 'resolved', label: '已解決' },
    { key: 'closed', label: '已關閉' },
  ];

  return (
    <div>
      {/* Source tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          marginBottom: '1.25rem',
          background: 'rgba(18,18,42,0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #2A2A4A',
          borderRadius: '0.75rem',
          padding: '0.3rem',
        }}
      >
        {([
          { key: 'local' as SourceTab, label: '本地 Issues' },
          { key: 'github' as SourceTab, label: 'GitHub Issues' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSourceTab(tab.key)}
            style={{
              flex: 1,
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: sourceTab === tab.key ? 'rgba(108,99,255,0.2)' : 'transparent',
              color: sourceTab === tab.key ? '#8B83FF' : '#9090B0',
              fontSize: '0.875rem',
              fontWeight: sourceTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (sourceTab !== tab.key) e.currentTarget.style.color = '#F0F0FF'; }}
            onMouseLeave={e => { if (sourceTab !== tab.key) e.currentTarget.style.color = '#9090B0'; }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sourceTab === 'github' ? (
        <GitHubIssuesTab />
      ) : (
        <>
          {/* Top action row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#9090B0' }}>
              <span style={{ color: '#00F5A0', fontWeight: 600 }}>{notClosedCount} 個 open</span>
              <span style={{ margin: '0 0.5rem', color: '#2A2A4A' }}>·</span>
              <span>{closedCount} 個 closed</span>
            </div>
            {!authLoading && !user ? (
              <button
                onClick={login}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1.25rem',
                  background: 'linear-gradient(135deg, #6C63FF, #E94560)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#F0F0FF',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                🔐 登入
              </button>
            ) : !authLoading && user ? (
              <button
                onClick={() => setShowCreateForm(v => !v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1.25rem',
                  background: showCreateForm ? 'rgba(108,99,255,0.15)' : 'linear-gradient(135deg, #6C63FF, #E94560)',
                  border: showCreateForm ? '1px solid rgba(108,99,255,0.4)' : 'none',
                  borderRadius: '0.5rem',
                  color: '#F0F0FF',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {showCreateForm ? '✕ 關閉' : '+ 新增 Issue'}
              </button>
            ) : null}
          </div>

          {/* Create form (collapsible) */}
          {showCreateForm && user && (
            <CreateIssueForm
              user={user}
              onCreated={() => {
                setShowCreateForm(false);
                fetchIssues();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          )}

          {/* Filter bar */}
          <div
            style={{
              background: 'rgba(18,18,42,0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid #2A2A4A',
              borderRadius: '0.75rem',
              padding: '0.75rem 1rem',
              marginBottom: '0.75rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Status tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              {statusTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  style={{
                    padding: '0.375rem 0.875rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: statusFilter === tab.key ? 'rgba(108,99,255,0.2)' : 'transparent',
                    color: statusFilter === tab.key ? '#8B83FF' : '#9090B0',
                    fontSize: '0.85rem',
                    fontWeight: statusFilter === tab.key ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (statusFilter !== tab.key) e.currentTarget.style.color = '#F0F0FF'; }}
                  onMouseLeave={e => { if (statusFilter !== tab.key) e.currentTarget.style.color = '#9090B0'; }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as IssueCategory | 'all')}
              onFocus={handleFocusIn}
              onBlur={handleFocusOut}
              style={{
                background: 'rgba(10,10,26,0.6)',
                border: '1px solid #2A2A4A',
                borderRadius: '0.5rem',
                padding: '0.375rem 0.75rem',
                color: '#9090B0',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all" style={{ background: '#12122A' }}>所有類別</option>
              <option value="bug" style={{ background: '#12122A' }}>🐛 Bug</option>
              <option value="feature" style={{ background: '#12122A' }}>✨ 功能</option>
              <option value="improvement" style={{ background: '#12122A' }}>🔧 改善</option>
              <option value="question" style={{ background: '#12122A' }}>❓ 問題</option>
            </select>
          </div>

          {/* Issue list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#9090B0' }}>
              載入中…
            </div>
          ) : issues.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'rgba(18,18,42,0.5)',
                border: '1px solid #2A2A4A',
                borderRadius: '1rem',
                color: '#606080',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
              <p style={{ fontSize: '0.95rem' }}>目前沒有符合條件的 Issues</p>
            </div>
          ) : (
            <div
              style={{
                border: '1px solid #2A2A4A',
                borderRadius: '0.75rem',
                overflow: 'hidden',
              }}
            >
              {issues.map((issue, idx) => (
                <div
                  key={issue.id}
                  onClick={() => setSelectedIssueId(issue.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.875rem',
                    padding: '1rem 1.25rem',
                    background: 'rgba(18,18,42,0.6)',
                    borderBottom: idx < issues.length - 1 ? '1px solid #2A2A4A' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,26,62,0.8)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(18,18,42,0.6)')}
                >
                  {/* Status dot */}
                  <div style={{ marginTop: '0.35rem', flexShrink: 0 }}>
                    <StatusDot status={issue.status} />
                  </div>

                  {/* Main content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: '#F0F0FF', fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.4 }}>
                        {issue.title}
                      </span>
                      <CategoryBadge category={issue.category} />
                      <PriorityBadge priority={issue.priority} />
                      {issue.resolved_version && (
                        <a
                          href="/changelog"
                          onClick={e => e.stopPropagation()}
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '0.3rem',
                            background: 'rgba(108,99,255,0.15)',
                            color: '#8B83FF',
                            border: '1px solid rgba(108,99,255,0.3)',
                            textDecoration: 'none',
                          }}
                        >
                          {issue.resolved_version}
                        </a>
                      )}
                    </div>

                    {issue.description && (
                      <p style={{ color: '#9090B0', fontSize: '0.825rem', margin: '0 0 0.4rem', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {issue.description.slice(0, 100)}{issue.description.length > 100 ? '…' : ''}
                      </p>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: '#606080', alignItems: 'center' }}>
                      <span>{issue.author}{issue.author_tag && <span> · {issue.author_tag}</span>}</span>
                      <span>{timeAgo(issue.created_at)}</span>
                    </div>
                  </div>

                  {/* Comment count */}
                  {issue.comments_count > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: '#606080',
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        marginTop: '0.15rem',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {issue.comments_count}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
