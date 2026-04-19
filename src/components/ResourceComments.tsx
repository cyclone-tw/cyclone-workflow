import { useState, useCallback } from 'react';
import { timeAgo } from '@/lib/time';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
}

interface User {
  id: string;
  name: string;
  display_name?: string;
  avatar_url?: string | null;
  effectiveRole: string;
}

interface ResourceCommentsProps {
  resourceType: 'knowledge' | 'ai-tool';
  resourceId: string;
  user: User | null;
  color?: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(10, 10, 26, 0.6)',
  border: '1px solid #2A2A4A',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  color: '#F0F0FF',
  fontSize: '0.85rem',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  boxSizing: 'border-box',
};

function handleFocusIn(e: React.FocusEvent<HTMLTextAreaElement>) {
  e.target.style.borderColor = '#6C63FF';
  e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)';
}

function handleFocusOut(e: React.FocusEvent<HTMLTextAreaElement>) {
  e.target.style.borderColor = '#2A2A4A';
  e.target.style.boxShadow = 'none';
}

function Avatar({ name, avatarUrl, size = 24 }: { name: string; avatarUrl: string | null; size?: number }) {
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
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function ResourceComments({ resourceType, resourceId, user, color = '#6C63FF' }: ResourceCommentsProps) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user ? ['captain', 'tech', 'admin'].includes(user.effectiveRole) : false;

  const loadComments = useCallback(async () => {
    if (comments.length > 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/${resourceType === 'knowledge' ? 'knowledge' : 'ai-tools'}/${resourceId}/comments`);
      const data = await res.json();
      if (data.ok) setComments(data.comments || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [comments.length, resourceType, resourceId]);

  const toggleOpen = () => {
    if (!open) loadComments();
    setOpen(!open);
  };

  const submit = async () => {
    if (!content.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/${resourceType === 'knowledge' ? 'knowledge' : 'ai-tools'}/${resourceId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setContent('');
        const reloadRes = await fetch(`/api/${resourceType === 'knowledge' ? 'knowledge' : 'ai-tools'}/${resourceId}/comments`);
        const reloadData = await reloadRes.json();
        if (reloadData.ok) setComments(reloadData.comments || []);
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('確定要刪除這則留言嗎？')) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch { /* ignore */ }
  };

  return (
    <div style={{ marginTop: '0.25rem' }}>
      <button
        onClick={toggleOpen}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '0.5rem 0.625rem',
          background: 'rgba(10,10,26,0.3)',
          border: `1px solid ${color}15`,
          borderRadius: '0.5rem',
          color: '#9090B0',
          fontSize: '0.75rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>💬 留言 ({comments.length})</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
      </button>

      {open && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.75rem',
          background: 'rgba(10,10,26,0.3)',
          borderRadius: '0.5rem',
          border: `1px solid ${color}15`,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          {loading ? (
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
                      {(c.author_id === user?.id || isAdmin) && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          style={{
                            marginLeft: 'auto',
                            fontSize: '0.65rem',
                            color: '#E94560',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          刪除
                        </button>
                      )}
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
              <Avatar name={user.display_name || user.name} avatarUrl={user.avatar_url ?? null} size={28} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="發表留言..."
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={handleFocusIn}
                  onBlur={handleFocusOut}
                  maxLength={500}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={submit}
                    disabled={submitting || !content.trim()}
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.4rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: content.trim() ? color : '#2A2A4A',
                      color: '#fff',
                      cursor: content.trim() ? 'pointer' : 'not-allowed',
                      fontWeight: 600,
                      opacity: submitting ? 0.6 : 1,
                    }}
                  >
                    {submitting ? '發送中...' : '發送'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
