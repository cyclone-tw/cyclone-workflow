import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useAuth } from '@/components/auth/useAuth';
import { timeAgo } from '@/lib/time';
import { ROLE_LEVEL } from '@/lib/auth';
import { sanitizeMarkdown, sanitizeUrl, sanitizeImgSrc } from '@/lib/markdown';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToolCategory = 'agent' | 'llm' | 'productivity' | 'dev' | 'other';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Tool {
  id: number;
  name: string;
  description: string;
  url: string;
  category: ToolCategory;
  author: string;
  author_tag: string;
  contributor_id: string;
  contributor_name: string;
  contributor_avatar: string | null;
  upvotes: number;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  is_favorited?: boolean;
  github_url?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ToolCategory, { label: string; icon: string; color: string }> = {
  agent: { label: 'Agent', icon: '🤖', color: '#6C63FF' },
  llm: { label: 'LLM', icon: '🧠', color: '#00D9FF' },
  productivity: { label: '生產力', icon: '⚡', color: '#00F5A0' },
  dev: { label: '開發', icon: '💻', color: '#FFC300' },
  other: { label: '其他', icon: '📦', color: '#9090B0' },
};

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

// ─── Permission helpers ────────────────────────────────────────────────────────

function canModifyTool(user: { id: string; effectiveRole: string } | null | undefined, tool: Tool): boolean {
  if (!user) return false;
  if (tool.contributor_id === user.id) return true;
  return (ROLE_LEVEL[user.effectiveRole] ?? 0) >= (ROLE_LEVEL['admin'] ?? 0);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  tool?: Tool | null;
  onClose: () => void;
  onSaved: () => void;
}

function ToolModal({ tool, onClose, onSaved }: ModalProps) {
  const { user } = useAuth();
  const isEdit = !!tool;
  const [name, setName] = useState(tool?.name ?? '');
  const [description, setDescription] = useState(tool?.description ?? '');
  const [url, setUrl] = useState(tool?.url ?? '');
  const [category, setCategory] = useState<ToolCategory>(tool?.category ?? 'other');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = '請填寫工具名稱';
    if (!description.trim()) errs.description = '請填寫簡介';
    if (!url.trim()) errs.url = '請填寫連結';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/ai-tools/${tool!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), description: description.trim(), url: url.trim(), category }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '更新失敗');
        }
      } else {
        const res = await fetch('/api/ai-tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), description: description.trim(), url: url.trim(), category }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '新增失敗');
        }
      }
      onSaved();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : (isEdit ? '更新失敗，請稍後再試' : '新增失敗，請稍後再試') });
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
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(18,18,42,0.95)', backdropFilter: 'blur(16px)',
          border: '1px solid #2A2A4A', borderRadius: '1rem',
          padding: '1.75rem', width: '100%', maxWidth: '480px',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <h3 style={{ color: '#F0F0FF', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.25rem' }}>
          {isEdit ? '編輯工具' : '新增工具'}
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Name + Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>工具名稱 <span style={{ color: '#E94560' }}>*</span></label>
              <input type="text" placeholder="e.g. Claude Code" value={name}
                onChange={e => setName(e.target.value)} onFocus={handleFocusIn} onBlur={handleFocusOut}
                style={{ ...inputStyle, borderColor: errors.name ? '#E94560' : '#2A2A4A' }} />
              {errors.name && <p style={{ color: '#E94560', fontSize: '0.75rem', marginTop: '0.2rem' }}>{errors.name}</p>}
            </div>
            <div>
              <label style={labelStyle}>分類</label>
              <select value={category} onChange={e => setCategory(e.target.value as ToolCategory)}
                onFocus={handleFocusIn} onBlur={handleFocusOut}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {(Object.entries(CATEGORY_CONFIG) as [ToolCategory, typeof CATEGORY_CONFIG[ToolCategory]][]).map(([key, cfg]) => (
                  <option key={key} value={key} style={{ background: '#12122A' }}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* URL */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>連結 <span style={{ color: '#E94560' }}>*</span></label>
            <input type="url" placeholder="https://..." value={url}
              onChange={e => setUrl(e.target.value)} onFocus={handleFocusIn} onBlur={handleFocusOut}
              style={{ ...inputStyle, borderColor: errors.url ? '#E94560' : '#2A2A4A' }} />
            {errors.url && <p style={{ color: '#E94560', fontSize: '0.75rem', marginTop: '0.2rem' }}>{errors.url}</p>}
          </div>

          {/* GitHub URL */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>GitHub Repo <span style={{ color: '#9090B0', fontWeight: 400 }}>(選填)</span></label>
            <input type="url" placeholder="https://github.com/..." value={githubUrl}
              onChange={e => setGithubUrl(e.target.value)} onFocus={handleFocusIn} onBlur={handleFocusOut}
              style={inputStyle} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>簡介 <span style={{ color: '#E94560' }}>*</span></label>
            <textarea placeholder="簡短描述這個工具的用途和特色..." rows={3} value={description}
              onChange={e => setDescription(e.target.value)} onFocus={handleFocusIn} onBlur={handleFocusOut}
              style={{ ...inputStyle, resize: 'vertical', borderColor: errors.description ? '#E94560' : '#2A2A4A' }} />
            {errors.description && <p style={{ color: '#E94560', fontSize: '0.75rem', marginTop: '0.2rem' }}>{errors.description}</p>}
          </div>

          {!isEdit && user && (
            <p style={{ fontSize: '0.8rem', color: '#606080', marginBottom: '0.75rem' }}>
              投稿者：{user.name}
            </p>
          )}

          {errors.submit && (
            <p style={{ color: '#E94560', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{errors.submit}</p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{
                padding: '0.6rem 1.25rem', background: 'transparent', border: '1px solid #2A2A4A',
                borderRadius: '0.5rem', color: '#9090B0', fontSize: '0.875rem', cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#6C63FF')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2A2A4A')}
            >
              取消
            </button>
            <button type="submit" disabled={submitting}
              style={{
                padding: '0.6rem 1.5rem',
                background: submitting ? 'rgba(108,99,255,0.4)' : 'linear-gradient(135deg, #6C63FF, #00D9FF)',
                border: 'none', borderRadius: '0.5rem', color: '#F0F0FF',
                fontSize: '0.875rem', fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? '儲存中…' : isEdit ? '儲存變更' : '新增工具'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ tool, onConfirm, onCancel }: { tool: Tool; onConfirm: () => void; onCancel: () => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/ai-tools/${tool.id}`, { method: 'DELETE' });
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
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(18,18,42,0.95)', border: '1px solid #E9456040',
          borderRadius: '1rem', padding: '1.75rem', width: '100%', maxWidth: '380px', textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗑️</div>
        <h3 style={{ color: '#F0F0FF', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
          確定要刪除「{tool.name}」嗎？
        </h3>
        <p style={{ color: '#9090B0', fontSize: '0.85rem', marginBottom: '1.5rem' }}>此操作無法復原</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={onCancel}
            style={{
              padding: '0.6rem 1.25rem', background: 'transparent', border: '1px solid #2A2A4A',
              borderRadius: '0.5rem', color: '#9090B0', fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button onClick={handleDelete} disabled={deleting}
            style={{
              padding: '0.6rem 1.5rem',
              background: deleting ? 'rgba(233,69,96,0.4)' : '#E94560',
              border: 'none', borderRadius: '0.5rem', color: '#F0F0FF',
              fontSize: '0.875rem', fontWeight: 600,
              cursor: deleting ? 'not-allowed' : 'pointer',
            }}
          >
            {deleting ? '刪除中…' : '確認刪除'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ tool, canEdit, loggedIn, onEdit, onDelete, onToggleFavorite }: { tool: Tool; canEdit: boolean; loggedIn: boolean; onEdit: () => void; onDelete: () => void; onToggleFavorite: () => void }) {
  const cfg = CATEGORY_CONFIG[tool.category] || CATEGORY_CONFIG.other;
  const [favBusy, setFavBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const checkOverflow = useCallback(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > contentRef.current.clientHeight);
    }
  }, []);

  useEffect(() => { checkOverflow(); }, [tool.description, checkOverflow]);

  async function handleFavorite() {
    setFavBusy(true);
    try { await onToggleFavorite(); } finally { setFavBusy(false); }
  }

  return (
    <article
      style={{
        background: 'rgba(18,18,42,0.7)', backdropFilter: 'blur(12px)',
        border: '1px solid #2A2A4A', borderRadius: '0.875rem',
        padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'default', overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 30px ${cfg.color}15`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header: category badge + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '999px',
            background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30`,
          }}
        >
          {cfg.icon} {cfg.label}
        </span>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          {loggedIn && (
            <button onClick={handleFavorite} disabled={favBusy}
              aria-label={tool.is_favorited ? '取消收藏' : '收藏'}
              title={tool.is_favorited ? '取消收藏' : '收藏'}
              style={{
                background: tool.is_favorited ? 'rgba(255,107,129,0.15)' : 'transparent',
                border: `1px solid ${tool.is_favorited ? 'rgba(255,107,129,0.3)' : '#2A2A4A'}`,
                borderRadius: '0.375rem', fontSize: '0.8rem',
                padding: '0.2rem 0.45rem', cursor: favBusy ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', opacity: favBusy ? 0.5 : 1,
              }}
            >
              {tool.is_favorited ? '❤️' : '🤍'}
            </button>
          )}
          {canEdit && (
            <>
              <button onClick={onEdit} title="編輯"
                style={{
                  background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)',
                  borderRadius: '0.375rem', color: '#8B83FF', fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem', cursor: 'pointer', transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(108,99,255,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(108,99,255,0.1)')}
              >
                ✏️
              </button>
              <button onClick={onDelete} title="刪除"
                style={{
                  background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.2)',
                  borderRadius: '0.375rem', color: '#E94560', fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem', cursor: 'pointer', transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(233,69,96,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(233,69,96,0.1)')}
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 style={{ color: '#F0F0FF', fontWeight: 700, fontSize: '1rem', lineHeight: 1.4, margin: 0 }}>
        {tool.name}
      </h3>

      {/* Description */}
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match && !String(children).includes('\n');
              if (isInline) {
                return (
                  <code style={{ background: '#2a2a4a', color: '#b0b0d0', borderRadius: '4px', padding: '0.1em 0.4em', fontSize: '0.85em', fontFamily: 'monospace' }} {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <code style={{ background: '#1e1e3a', color: '#90b0ff', borderRadius: '6px', padding: '0.8em 1em', display: 'block', overflowX: 'auto', fontSize: '0.85em', fontFamily: 'monospace', border: '1px solid #3a3a6a' }} {...props}>
                  {children}
                </code>
              );
            },
            a({ href, children, ...props }) {
              const safe = sanitizeUrl(href);
              if (!safe) return <span {...props}>{children}</span>;
              return (
                <a href={safe} target="_blank" rel="noopener noreferrer" style={{ color: '#80a0ff', textDecoration: 'underline' }} {...props}>
                  {children}
                </a>
              );
            },
            img({ src, alt }) {
              const safeSrc = sanitizeImgSrc(src);
              if (!safeSrc) return null;
              return <img src={safeSrc} alt={alt || ''} style={{ maxWidth: '100%', borderRadius: '6px', marginTop: '0.5em' }} />;
            },
          }}
        >
          {sanitizeMarkdown(tool.description)}
        </ReactMarkdown>
        {(!expanded && isOverflowing) && (
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '1.6em',
              background: 'linear-gradient(transparent, rgba(18,18,42,0.9))',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      {(isOverflowing || expanded) && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={`tool-content-${tool.id}`}
          style={{
            fontSize: '0.75rem', color: cfg.color, background: 'transparent',
            border: 'none', cursor: 'pointer', padding: '0.2rem 0',
            alignSelf: 'flex-start',
          }}
        >
          {expanded ? '收納 ↑' : '展開更多 ↓'}
        </button>
      )}

      {/* URL link */}
      {(() => {
        let validUrl: URL | null = null;
        try {
          const parsed = new URL(tool.url);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') validUrl = parsed;
        } catch { /* invalid */ }
        const display = validUrl ? validUrl.hostname : tool.url;
        const linkStyle: React.CSSProperties = {
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          fontSize: '0.8rem', color: validUrl ? cfg.color : '#606080', textDecoration: 'none',
          padding: '0.35rem 0.65rem', borderRadius: '0.375rem',
          background: `${validUrl ? cfg.color : '#606080'}10`,
          border: `1px solid ${validUrl ? cfg.color : '#606080'}20`,
          transition: 'background 0.2s', alignSelf: 'flex-start',
        };
        if (validUrl) {
          return (
            <a href={validUrl.href} target="_blank" rel="noopener noreferrer" style={linkStyle}
              onMouseEnter={e => (e.currentTarget.style.background = `${cfg.color}20`)}
              onMouseLeave={e => (e.currentTarget.style.background = `${cfg.color}10`)}
            >
              🔗 {display}
            </a>
          );
        }
        return <span style={linkStyle}>🔗 {display}</span>;
      })()}

      {/* Tags */}
      {tool.tags && tool.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {tool.tags.map((tag) => (
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #2A2A4A' }}>
        {tool.contributor_avatar ? (
          <img
            src={tool.contributor_avatar}
            alt=""
            style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '1rem' }}>🤖</span>
        )}
        <span style={{ fontSize: '0.75rem', color: '#9090B0' }}>
          {tool.contributor_name || tool.author}
        </span>
        <span style={{ color: '#2A2A4A' }}>·</span>
        <span style={{ fontSize: '0.75rem', color: '#606080' }}>{timeAgo(tool.created_at)}</span>
      </div>
    </article>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ToolCardBoard() {
  const { user } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ToolCategory | 'all'>('all');
  const [contributorFilter, setContributorFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; avatar: string }[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [deletingTool, setDeletingTool] = useState<Tool | null>(null);

  async function fetchTools() {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (contributorFilter) params.set('contributor_id', contributorFilter);
      if (tagFilter) params.set('tag', tagFilter);
      const res = await fetch(`/api/ai-tools?${params}`);
      if (!res.ok) throw new Error('載入失敗');
      const data = await res.json();
      setTools(data.tools || []);
    } catch {
      setLoadError(true);
      setTools([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTools(); }, [categoryFilter, contributorFilter, tagFilter]);

  async function fetchTags() {
    try {
      const res = await fetch('/api/tags?category=ai-tools');
      if (!res.ok) return;
      const data = await res.json();
      setAvailableTags(data.tags || []);
    } catch { /* silent */ }
  }

  useEffect(() => { fetchTags(); }, []);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        if (data.ok) setMembers(data.members);
      } catch { /* silent */ }
    }
    fetchMembers();
  }, []);

  async function toggleFavorite(tool: Tool) {
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_type: 'ai-tool', resource_id: String(tool.id) }),
      });
      if (!res.ok) throw new Error('操作失敗');
      const data = await res.json();
      setTools(prev => prev.map(t =>
        t.id === tool.id ? { ...t, is_favorited: data.favorited } : t
      ));
    } catch { /* silent */ }
  }

  // Permission map
  const canEditMap: Record<number, boolean> = {};
  for (const t of tools) {
    canEditMap[t.id as number] = canModifyTool(user, t);
  }

  const categoryTabs: { key: ToolCategory | 'all'; label: string; icon: string }[] = [
    { key: 'all', label: '全部', icon: '🔍' },
    ...Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => ({ key: key as ToolCategory, label: cfg.label, icon: cfg.icon })),
  ];

  return (
    <div>
      {/* Top action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.875rem', color: '#9090B0' }}>
          <span style={{ color: '#00F5A0', fontWeight: 600 }}>{tools.length} 個工具</span>
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
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            + 新增工具
          </button>
        )}
      </div>

      {/* Category filter tabs */}
      <div
        style={{
          background: 'rgba(18,18,42,0.7)', backdropFilter: 'blur(12px)',
          border: '1px solid #2A2A4A', borderRadius: '0.75rem',
          padding: '0.5rem', marginBottom: '0.75rem',
          display: 'flex', gap: '0.25rem', flexWrap: 'wrap',
        }}
      >
        {categoryTabs.map(tab => {
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
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#F0F0FF'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#9090B0'; }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contributor filter */}
      <div style={{ marginBottom: '1.25rem' }}>
        <select
          value={contributorFilter}
          onChange={(e) => setContributorFilter(e.target.value)}
          style={{
            ...inputStyle,
            width: 'auto',
            minWidth: 160,
            maxWidth: 240,
            fontSize: '0.8rem',
            padding: '0.4rem 0.75rem',
            cursor: 'pointer',
          }}
        >
          <option value="">全部成員</option>
          {members.map((m) => (
            <option key={m.id} value={m.id} style={{ background: '#12122A' }}>
              {m.avatar} {m.name}
            </option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          style={{
            ...inputStyle,
            width: 'auto',
            minWidth: 140,
            maxWidth: 200,
            fontSize: '0.8rem',
            padding: '0.4rem 0.75rem',
            cursor: 'pointer',
            marginLeft: '0.5rem',
          }}
        >
          <option value="">全部標籤</option>
          {availableTags.map((t) => (
            <option key={t.id} value={t.name} style={{ background: '#12122A' }}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Card grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9090B0' }}>載入中…</div>
      ) : loadError ? (
        <div
          style={{
            textAlign: 'center', padding: '4rem 2rem',
            background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.3)',
            borderRadius: '1rem', color: '#E94560',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
          <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>載入失敗，請稍後再試</p>
          <button onClick={fetchTools}
            style={{
              marginTop: '0.5rem', padding: '0.5rem 1.25rem',
              background: 'rgba(233,69,96,0.15)', border: '1px solid rgba(233,69,96,0.3)',
              borderRadius: '0.5rem', color: '#E94560', fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            重試
          </button>
        </div>
      ) : tools.length === 0 ? (
        <div
          style={{
            textAlign: 'center', padding: '4rem 2rem',
            background: 'rgba(18,18,42,0.5)', border: '1px solid #2A2A4A',
            borderRadius: '1rem', color: '#606080',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🤖</div>
          <p style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>還沒有工具卡片</p>
          <p style={{ fontSize: '0.85rem' }}>
            {user ? '點擊「+ 新增工具」來分享你發現的好用 AI 工具！' : '登入後即可分享 AI 工具'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {tools.map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              canEdit={canEditMap[tool.id as number] || false}
              loggedIn={!!user}
              onEdit={() => setEditingTool(tool)}
              onDelete={() => setDeletingTool(tool)}
              onToggleFavorite={() => toggleFavorite(tool)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <ToolModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => { setShowCreateModal(false); fetchTools(); }}
        />
      )}

      {/* Edit modal */}
      {editingTool && (
        <ToolModal
          tool={editingTool}
          onClose={() => setEditingTool(null)}
          onSaved={() => { setEditingTool(null); fetchTools(); }}
        />
      )}

      {/* Delete confirm */}
      {deletingTool && (
        <DeleteConfirm
          tool={deletingTool}
          onConfirm={() => { setDeletingTool(null); fetchTools(); }}
          onCancel={() => setDeletingTool(null)}
        />
      )}
    </div>
  );
}
