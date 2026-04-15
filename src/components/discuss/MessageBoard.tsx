import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import DOMPurify from 'dompurify';
import { useAuth } from '@/components/auth/useAuth';
import { ROLE_LEVEL } from '@/lib/auth';
import { timeAgo } from '@/lib/time';

interface Message {
  id: number;
  author: string;
  author_id: string | null;
  content: string;
  tag: string;
  category: string;
  created_at: string;
  like_count: number;
}

const CATEGORIES = ['一般討論', '功能建議', '許願樹討論', '技術問題', '成果分享'];

const CATEGORY_COLORS: Record<string, string> = {
  '一般討論': 'var(--color-primary)',
  '功能建議': 'var(--color-neon-green)',
  '許願樹討論': 'var(--color-accent)',
  '技術問題': 'var(--color-neon-blue)',
  '成果分享': '#FFD93D',
};

function MessageCard({
  msg,
  likedIds,
  onToggleLike,
  isLoggedIn,
  likeLoadingIds,
  currentUser,
  onDelete,
}: {
  msg: Message;
  likedIds: Set<number>;
  onToggleLike: (messageId: number, currentLiked: boolean) => void;
  isLoggedIn: boolean;
  likeLoadingIds: Set<number>;
  currentUser: { id: string; effectiveRole: string } | null;
  onDelete: (messageId: number) => void;
}) {
  const color = CATEGORY_COLORS[msg.category] || 'var(--color-primary)';
  const liked = likedIds.has(msg.id);
  const isLikeLoading = likeLoadingIds.has(msg.id);

  const canDelete = currentUser && (
    msg.author_id === currentUser.id ||
    (ROLE_LEVEL[currentUser.effectiveRole] ?? 0) >= (ROLE_LEVEL['admin'] ?? 0)
  );

  return (
    <div
      className="rounded-xl p-4 transition-all min-w-0 overflow-hidden"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderLeftWidth: '3px',
        borderLeftColor: color,
      }}
    >
      <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: `${color}20`, color }}
          >
            {msg.author[0]}
          </span>
          <div className="min-w-0">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {msg.author}
            </span>
            {msg.tag && (
              <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>
                {msg.tag}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            {msg.category}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {timeAgo(msg.created_at)}
          </span>
        </div>
      </div>
      <div
        className="text-sm leading-relaxed break-words prose prose-sm max-w-none"
        style={{ color: 'var(--color-text-secondary)', overflowWrap: 'anywhere' }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match && !String(children).includes('\n');
              if (isInline) {
                return (
                  <code
                    className="px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--color-neon-green)' }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <code
                  className="block p-3 rounded-lg text-xs font-mono overflow-x-auto"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-neon-blue)' }}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            a({ href, children, ...props }) {
              if (!href) return <span {...props}>{children}</span>;
              const safe = DOMPurify.sanitize(href, { RETURN_TRUSTED_TYPE: false }) as string;
              return (
                <a
                  href={safe}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-80"
                  style={{ color: 'var(--color-neon-blue)' }}
                  {...props}
                >
                  {children}
                </a>
              );
            },
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>
      <div className="flex items-center justify-end mt-2 gap-2">
        {canDelete && (
          <button
            onClick={() => {
              if (confirm('確定要刪除這則留言嗎？')) onDelete(msg.id);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:opacity-80"
            style={{
              background: 'transparent',
              color: 'var(--color-text-muted)',
              border: 'none',
              cursor: 'pointer',
            }}
            title="刪除留言"
          >
            🗑️ 刪除
          </button>
        )}
        <button
          onClick={() => onToggleLike(msg.id, liked)}
          disabled={!isLoggedIn || isLikeLoading}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
          style={{
            background: liked ? 'rgba(255, 77, 106, 0.1)' : 'transparent',
            color: liked ? '#FF4D6A' : 'var(--color-text-muted)',
            cursor: !isLoggedIn || isLikeLoading ? 'not-allowed' : 'pointer',
            opacity: !isLoggedIn ? 0.5 : 1,
            border: 'none',
          }}
          title={!isLoggedIn ? '請先登入才能按讚' : liked ? '收回讚' : '按讚'}
        >
          <span style={{ fontSize: '14px' }}>{liked ? '❤️' : '🤍'}</span>
          <span>{msg.like_count > 0 ? msg.like_count : ''}</span>
        </button>
      </div>
    </div>
  );
}

export default function MessageBoard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [tag, setTag] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('一般討論');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [filter, setFilter] = useState('全部');
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [likeLoadingIds, setLikeLoadingIds] = useState<Set<number>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const { user, loading: authLoading, login } = useAuth();

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      if (data.ok) {
        const msgs = data.messages as Message[];
        setMessages(msgs);

        // If logged in, fetch which messages the user has liked
        if (user && msgs.length > 0) {
          try {
            const likeChecks = await Promise.all(
              msgs.map((m: Message) =>
                fetch(`/api/messages/likes?message_id=${m.id}`)
                  .then((r) => r.json())
                  .then((d) => ({ id: m.id, liked: d.ok ? d.liked : false }))
                  .catch(() => ({ id: m.id, liked: false }))
              )
            );
            const newLiked = new Set<number>();
            for (const lc of likeChecks) {
              if (lc.liked) newLiked.add(lc.id);
            }
            setLikedIds(newLiked);
          } catch {
            // Non-critical — proceed without like state
          }
        }
      }
    } catch {
      setError('載入留言失敗');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchMessages();
    }
  }, [authLoading, fetchMessages]);

  const handleToggleLike = async (messageId: number, currentLiked: boolean) => {
    if (!user) return;
    if (likeLoadingIds.has(messageId)) return;

    // Snapshot current liked state so we can revert on failure
    const prevLiked = currentLiked;

    // Optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (currentLiked) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });

    // Optimistic count update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, like_count: Math.max(0, m.like_count + (currentLiked ? -1 : 1)) }
          : m
      )
    );

    // Mark this message as in-flight (other messages stay clickable)
    setLikeLoadingIds((prev) => {
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });

    const revert = () => {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (prevLiked) {
          next.add(messageId);
        } else {
          next.delete(messageId);
        }
        return next;
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, like_count: m.like_count + (prevLiked ? 1 : -1) }
            : m
        )
      );
    };

    try {
      const res = await fetch('/api/messages/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) {
        // Sync authoritative values from the server
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (data.liked) {
            next.add(messageId);
          } else {
            next.delete(messageId);
          }
          return next;
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, like_count: Number(data.count ?? m.like_count) } : m
          )
        );
      } else {
        revert();
        if (res.status === 401) {
          setError('請先登入才能按讚');
        }
      }
    } catch (err) {
      console.error('Toggle like failed:', err);
      revert();
    } finally {
      setLikeLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('請填寫留言內容');
      return;
    }
    setPosting(true);
    setError('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), tag: tag.trim(), category }),
      });
      const data = await res.json();
      if (data.ok) {
        setContent('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        fetchMessages();
      } else {
        setError(data.error || '送出失敗');
      }
    } catch {
      setError('網路錯誤，請稍後再試');
    } finally {
      setPosting(false);
    }
  };

  const filtered = filter === '全部' ? messages : messages.filter((m) => m.category === filter);

  const handleDelete = async (messageId: number) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else {
        setError(data.error || '刪除失敗');
      }
    } catch {
      setError('網路錯誤，無法刪除');
    }
  };

  return (
    <div className="space-y-6">
      {/* Post form — login required */}
      {!authLoading && !user ? (
        <div
          className="rounded-xl p-5 flex flex-col items-center gap-3 text-center"
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-2xl">💬</p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            請先登入再留言
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            已有帳號的隊員才能發表討論留言
          </p>
          <button
            onClick={login}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            🔐 登入 Discord
          </button>
        </div>
      ) : !authLoading && user ? (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="rounded-xl p-5 space-y-4"
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            ✍️ 發表留言
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
              以 {user.name} 發表
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Discord Tag (選填)"
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="說點什麼... 可以討論功能建議、許願樹改版、成果分享等 *"
            required
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {content.length}/2000
            </span>
            <div className="flex items-center gap-3">
              {success && (
                <span className="text-xs" style={{ color: 'var(--color-neon-green)' }}>
                  ✅ 留言成功！
                </span>
              )}
              {error && (
                <span className="text-xs" style={{ color: 'var(--color-accent)' }}>
                  {error}
                </span>
              )}
              <button
                type="submit"
                disabled={posting}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity"
                style={{
                  background: 'var(--color-primary)',
                  color: '#fff',
                  opacity: posting ? 0.6 : 1,
                }}
              >
                {posting ? '送出中...' : '📤 送出留言'}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {['全部', ...CATEGORIES].map((c) => {
          const color = c === '全部' ? 'var(--color-text-muted)' : (CATEGORY_COLORS[c] || 'var(--color-primary)');
          const active = filter === c;
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: active ? `${color}20` : 'transparent',
                color: active ? color : 'var(--color-text-muted)',
                border: `1px solid ${active ? color : 'var(--color-border)'}`,
              }}
            >
              {c} {c !== '全部' && `(${messages.filter((m) => m.category === c).length})`}
            </button>
          );
        })}
      </div>

      {/* Messages list */}
      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          載入留言中...
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-3xl mb-3">💬</p>
          <p style={{ color: 'var(--color-text-muted)' }}>
            {filter === '全部' ? '還沒有留言，成為第一個發言的人！' : `「${filter}」分類還沒有留言`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              likedIds={likedIds}
              onToggleLike={handleToggleLike}
              isLoggedIn={!!user}
              likeLoadingIds={likeLoadingIds}
              currentUser={user}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
