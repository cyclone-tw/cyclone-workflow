import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth/useAuth';
import MessageCard, { type Message, CATEGORIES, CATEGORY_COLORS } from './MessageCard';

const SORT_OPTIONS = ['最新', '最舊', '最多回饋'] as const;

export default function MessageBoard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [tag, setTag] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('閒聊');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [filter, setFilter] = useState('全部');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>('最新');
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [likeLoadingIds, setLikeLoadingIds] = useState<Set<number>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { user, loading: authLoading, login } = useAuth();

  // Flatten all messages (top-level + nested replies) for like checking
  const flattenMessages = (msgs: Message[]): Message[] => {
    const flat: Message[] = [];
    for (const m of msgs) {
      flat.push(m);
      if (m.replies?.length) flat.push(...m.replies);
    }
    return flat;
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      if (data.ok) {
        const msgs = data.messages as Message[];
        setMessages(msgs);

        if (user && msgs.length > 0) {
          try {
            const allMsgs = flattenMessages(msgs);
            const likeChecks = await Promise.all(
              allMsgs.map((m: Message) =>
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
          } catch { /* Non-critical */ }
        }
      }
    } catch {
      setError('載入留言失敗');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleReport = async (messageId: number, reason: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === messageId) return { ...m, report_count: m.report_count + 1, reported_by_me: true };
            if (m.replies?.length) {
              return { ...m, replies: m.replies.map((r) =>
                r.id === messageId ? { ...r, report_count: r.report_count + 1, reported_by_me: true } : r
              )};
            }
            return m;
          })
        );
      } else {
        alert(data.error || '檢舉失敗');
      }
    } catch {
      alert('網路錯誤，請稍後再試');
    }
  };

  useEffect(() => {
    if (!authLoading) fetchMessages();
  }, [authLoading, fetchMessages]);

  const handleToggleLike = async (messageId: number, currentLiked: boolean) => {
    if (!user) return;
    if (likeLoadingIds.has(messageId)) return;

    const prevLiked = currentLiked;

    setLikedIds((prev) => {
      const next = new Set(prev);
      if (currentLiked) next.delete(messageId); else next.add(messageId);
      return next;
    });

    const delta = currentLiked ? -1 : 1;
    const updateLikeCount = (ms: Message[]) =>
      ms.map((m) => m.id === messageId ? { ...m, like_count: Math.max(0, m.like_count + delta) } : m);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) return { ...m, like_count: Math.max(0, m.like_count + delta) };
        if (m.replies?.length) return { ...m, replies: updateLikeCount(m.replies) };
        return m;
      })
    );

    setLikeLoadingIds((prev) => { const n = new Set(prev); n.add(messageId); return n; });

    const revert = () => {
      setLikedIds((prev) => { const n = new Set(prev); if (prevLiked) n.add(messageId); else n.delete(messageId); return n; });
      const revertDelta = prevLiked ? 1 : -1;
      const revertCount = (ms: Message[]) =>
        ms.map((m) => m.id === messageId ? { ...m, like_count: m.like_count + revertDelta } : m);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) return { ...m, like_count: m.like_count + revertDelta };
          if (m.replies?.length) return { ...m, replies: revertCount(m.replies) };
          return m;
        })
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
        setLikedIds((prev) => { const n = new Set(prev); if (data.liked) n.add(messageId); else n.delete(messageId); return n; });
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === messageId) return { ...m, like_count: Number(data.count ?? m.like_count) };
            if (m.replies?.length) return { ...m, replies: m.replies.map((r) => r.id === messageId ? { ...r, like_count: Number(data.count ?? r.like_count) } : r) };
            return m;
          })
        );
      } else {
        revert();
        if (res.status === 401) setError('請先登入才能按讚');
      }
    } catch (err) {
      console.error('Toggle like failed:', err);
      revert();
    } finally {
      setLikeLoadingIds((prev) => { const n = new Set(prev); n.delete(messageId); return n; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) { setError('請填寫留言內容'); return; }
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
        if (contentTextareaRef.current) contentTextareaRef.current.style.height = '72px';
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

  const handleReply = async (parentId: number, replyContent: string) => {
    if (!user || !replyContent.trim()) return;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim(), parent_id: parentId }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchMessages();
      } else {
        alert(data.error || '回覆失敗');
      }
    } catch {
      alert('網路錯誤，無法回覆');
    }
  };

  const handleDelete = async (messageId: number) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        const now = new Date().toISOString();
        const markDeleted = (ms: Message[]) =>
          ms.map((m) => m.id === messageId ? { ...m, deleted_at: now, deleted_by: user?.id ?? null } : m);
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === messageId) return { ...m, deleted_at: now, deleted_by: user?.id ?? null };
            if (m.replies?.length) return { ...m, replies: markDeleted(m.replies) };
            return m;
          })
        );
      } else {
        setError(data.error || '刪除失敗');
      }
    } catch {
      setError('網路錯誤，無法刪除');
    }
  };

  const handleEdit = (messageId: number, newContent: string) => {
    const now = new Date().toISOString();
    const updateContent = (ms: Message[]) =>
      ms.map((m) => m.id === messageId ? { ...m, content: newContent, edited_at: now } : m);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) return { ...m, content: newContent, edited_at: now };
        if (m.replies?.length) return { ...m, replies: updateContent(m.replies) };
        return m;
      })
    );
  };

  const handlePinToggle = (messageId: number, pinned: number) => {
    setMessages((prev) => {
      const updated = prev.map((m) => (m.id === messageId ? { ...m, pinned } : m));
      return updated.sort((a, b) => {
        if (b.pinned !== a.pinned) return b.pinned - a.pinned;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });
  };

  const filtered = filter === '全部' ? messages : messages.filter((m) => m.category === filter);
  const sortedFiltered = [...filtered].sort((a, b) => {
    if (b.pinned !== a.pinned) return b.pinned - a.pinned;
    if (sortBy === '最新') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === '最舊') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === '最多回饋') return (b.like_count + b.reply_count) - (a.like_count + a.reply_count);
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Post form */}
      {!authLoading && !user ? (
        <div className="rounded-xl p-5 flex flex-col items-center gap-3 text-center" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-2xl">💬</p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>請先登入再留言</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>已有帳號的隊員才能發表討論留言</p>
          <button onClick={login} className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80" style={{ background: 'var(--color-primary)', color: '#fff' }}>
            🔐 登入 Discord
          </button>
        </div>
      ) : !authLoading && user ? (
        <form ref={formRef} onSubmit={handleSubmit} className="rounded-xl p-5 space-y-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            ✍️ 發表留言
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>以 {user.display_name || user.name} 發表</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Discord Tag (選填)"
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <textarea
            ref={contentTextareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            placeholder="說點什麼... 可以討論功能建議、許願樹改版、成果分享等 *"
            required
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none overflow-hidden"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', minHeight: '72px', resize: 'none' }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{content.length}/2000</span>
            <div className="flex items-center gap-3">
              {success && <span className="text-xs" style={{ color: 'var(--color-neon-green)' }}>✅ 留言成功！</span>}
              {error && <span className="text-xs" style={{ color: 'var(--color-accent)' }}>{error}</span>}
              <button type="submit" disabled={posting} className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity"
                style={{ background: 'var(--color-primary)', color: '#fff', opacity: posting ? 0.6 : 1 }}>
                {posting ? '送出中...' : '📤 送出留言'}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {/* Filter tabs + Sort */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          {['全部', ...CATEGORIES].map((c) => {
            const color = c === '全部' ? 'var(--color-text-muted)' : (CATEGORY_COLORS[c] || 'var(--color-primary)');
            const active = filter === c;
            return (
              <button key={c} onClick={() => setFilter(c)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: active ? `${color}20` : 'transparent', color: active ? color : 'var(--color-text-muted)', border: `1px solid ${active ? color : 'var(--color-border)'}` }}>
                {c} {c !== '全部' && `(${messages.filter((m) => m.category === c).length})`}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>排序</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as (typeof SORT_OPTIONS)[number])}
            className="px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
            {SORT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>

      {/* Messages list */}
      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>載入留言中...</div>
      ) : sortedFiltered.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-3xl mb-3">💬</p>
          <p style={{ color: 'var(--color-text-muted)' }}>
            {filter === '全部' ? '還沒有留言，成為第一個發言的人！' : `「${filter}」分類還沒有留言`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedFiltered.map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              likedIds={likedIds}
              onToggleLike={handleToggleLike}
              isLoggedIn={!!user}
              likeLoadingIds={likeLoadingIds}
              currentUser={user}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onPinToggle={handlePinToggle}
              onReport={handleReport}
              replies={msg.replies || []}
              replyCount={msg.reply_count || 0}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
