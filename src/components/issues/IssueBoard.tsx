import { useState, useEffect } from 'react';

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
  'open': '#00F5A0',
  'in-progress': '#00D9FF',
  'resolved': '#6C63FF',
  'closed': '#606080',
};

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  'bug': '🐛 Bug',
  'feature': '✨ 功能',
  'improvement': '🔧 改善',
  'question': '❓ 問題',
};

const CATEGORY_COLORS: Record<IssueCategory, { bg: string; color: string }> = {
  'bug': { bg: 'rgba(233,69,96,0.15)', color: '#E94560' },
  'feature': { bg: 'rgba(0,245,160,0.15)', color: '#00F5A0' },
  'improvement': { bg: 'rgba(0,217,255,0.15)', color: '#00D9FF' },
  'question': { bg: 'rgba(255,195,0,0.15)', color: '#FFC300' },
};

const PRIORITY_LABELS: Record<IssuePriority, string> = {
  'critical': '🔴 Critical',
  'high': '🟠 High',
  'medium': '🟡 Medium',
  'low': '⚪ Low',
};

const PRIORITY_COLORS: Record<IssuePriority, { bg: string; color: string }> = {
  'critical': { bg: 'rgba(233,69,96,0.2)', color: '#E94560' },
  'high': { bg: 'rgba(255,140,0,0.2)', color: '#FF8C00' },
  'medium': { bg: 'rgba(255,195,0,0.15)', color: '#FFC300' },
  'low': { bg: 'rgba(96,96,128,0.2)', color: '#9090B0' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  if (days < 30) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-TW');
}

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
}

function CreateIssueForm({ onCreated, onCancel }: CreateFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [authorTag, setAuthorTag] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [category, setCategory] = useState<IssueCategory>('bug');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '請填寫標題';
    if (!description.trim()) newErrors.description = '請填寫描述';
    if (!author.trim()) newErrors.author = '請填寫名稱';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, author, author_tag: authorTag, priority, category }),
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
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Author */}
        <div>
          <label style={labelStyle}>姓名 <span style={{ color: '#E94560' }}>*</span></label>
          <input
            type="text"
            placeholder="你的名稱"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            onFocus={handleFocusIn}
            onBlur={handleFocusOut}
            style={{ ...inputStyle, borderColor: errors.author ? '#E94560' : '#2A2A4A' }}
          />
          {errors.author && <p style={{ color: '#E94560', fontSize: '0.75rem', marginTop: '0.2rem' }}>{errors.author}</p>}
        </div>
        {/* Author tag */}
        <div>
          <label style={labelStyle}>Discord Tag（選填）</label>
          <input
            type="text"
            placeholder="@username"
            value={authorTag}
            onChange={e => setAuthorTag(e.target.value)}
            onFocus={handleFocusIn}
            onBlur={handleFocusOut}
            style={inputStyle}
          />
        </div>
      </div>

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
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentTag, setCommentTag] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState(false);

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
    if (!commentAuthor.trim()) errs.author = '請填寫名稱';
    if (!commentContent.trim()) errs.content = '請填寫留言內容';
    setCommentErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: commentAuthor, author_tag: commentTag, content: commentContent }),
      });
      if (!res.ok) throw new Error('留言失敗');
      setCommentAuthor('');
      setCommentTag('');
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
      <div style={cardStyle}>
        <h3 style={{ color: '#9090B0', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          新增留言
        </h3>
        <form onSubmit={handleAddComment}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>名稱 <span style={{ color: '#E94560' }}>*</span></label>
              <input
                type="text"
                placeholder="你的名稱"
                value={commentAuthor}
                onChange={e => setCommentAuthor(e.target.value)}
                onFocus={handleFocusIn}
                onBlur={handleFocusOut}
                style={{ ...inputStyle, borderColor: commentErrors.author ? '#E94560' : '#2A2A4A' }}
              />
              {commentErrors.author && <p style={{ color: '#E94560', fontSize: '0.75rem', marginTop: '0.2rem' }}>{commentErrors.author}</p>}
            </div>
            <div>
              <label style={labelStyle}>Discord Tag（選填）</label>
              <input
                type="text"
                placeholder="@username"
                value={commentTag}
                onChange={e => setCommentTag(e.target.value)}
                onFocus={handleFocusIn}
                onBlur={handleFocusOut}
                style={inputStyle}
              />
            </div>
          </div>
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
    </div>
  );
}

// ─── Main IssueBoard ──────────────────────────────────────────────────────────

export default function IssueBoard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | 'all'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);

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
      {/* Top action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.875rem', color: '#9090B0' }}>
          <span style={{ color: '#00F5A0', fontWeight: 600 }}>{notClosedCount} 個 open</span>
          <span style={{ margin: '0 0.5rem', color: '#2A2A4A' }}>·</span>
          <span>{closedCount} 個 closed</span>
        </div>
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
      </div>

      {/* Create form (collapsible) */}
      {showCreateForm && (
        <CreateIssueForm
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
    </div>
  );
}
