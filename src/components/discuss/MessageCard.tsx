import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { sanitizeUrl, sanitizeImgSrc, sanitizeMarkdown } from '../../lib/markdown';
import { ROLE_LEVEL } from '@/lib/auth';
import { timeAgo } from '@/lib/time';
import ReplyForm from './ReplyForm';

export interface Message {
  id: number;
  author: string;
  author_id: string | null;
  content: string;
  tag: string;
  category: string;
  created_at: string;
  edited_at: string | null;
  pinned: number;
  like_count: number;
  deleted_at: string | null;
  deleted_by: string | null;
  report_count: number;
  reported_by_me?: boolean;
  parent_id: number | null;
  reply_count: number;
  replies: Message[];
}

export const CATEGORIES = ['閒聊', '成果分享', '問題', '建議'];

export const CATEGORY_COLORS: Record<string, string> = {
  '閒聊': 'var(--color-primary)',
  '成果分享': '#FFD93D',
  '問題': 'var(--color-neon-blue)',
  '建議': 'var(--color-neon-green)',
};

export default function MessageCard({
  msg,
  likedIds,
  onToggleLike,
  isLoggedIn,
  likeLoadingIds,
  currentUser,
  onDelete,
  onEdit,
  onPinToggle,
  onReport,
  replies,
  replyCount,
  onReply,
  isReply = false,
}: {
  msg: Message;
  likedIds: Set<number>;
  onToggleLike: (messageId: number, currentLiked: boolean) => void;
  isLoggedIn: boolean;
  likeLoadingIds: Set<number>;
  currentUser: { id: string; name?: string; effectiveRole: string } | null;
  onDelete: (messageId: number) => void;
  onEdit: (messageId: number, newContent: string) => void;
  onPinToggle: (messageId: number, pinned: number) => void;
  onReport: (messageId: number, reason: string) => void;
  replies: Message[];
  replyCount: number;
  onReply: (parentId: number, content: string) => Promise<void>;
  isReply?: boolean;
}) {
  const color = CATEGORY_COLORS[msg.category] || 'var(--color-primary)';
  const liked = likedIds.has(msg.id);
  const isLikeLoading = likeLoadingIds.has(msg.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [editSaving, setEditSaving] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const canModify = currentUser && (
    msg.author_id === currentUser.id ||
    (ROLE_LEVEL[currentUser.effectiveRole] ?? 0) >= (ROLE_LEVEL['admin'] ?? 0)
  );
  const canPin = !isReply && currentUser &&
    (ROLE_LEVEL[currentUser.effectiveRole] ?? 0) >= (ROLE_LEVEL['admin'] ?? 0);

  const handlePinToggle = async () => {
    if (pinLoading) return;
    const nextPinned = msg.pinned ? 0 : 1;
    setPinLoading(true);
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: nextPinned }),
      });
      const data = await res.json();
      if (data.ok) {
        onPinToggle(msg.id, nextPinned);
      } else {
        alert(data.error || '操作失敗');
      }
    } catch {
      alert('網路錯誤，無法置頂');
    } finally {
      setPinLoading(false);
    }
  };

  const handleSave = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === msg.content) {
      setIsEditing(false);
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json();
      if (data.ok) {
        onEdit(msg.id, trimmed);
        setIsEditing(false);
      } else {
        alert(data.error || '儲存失敗');
      }
    } catch {
      alert('網路錯誤，無法儲存');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(msg.content);
    setIsEditing(false);
  };

  return (
    <>
      <div
        className="rounded-xl transition-all min-w-0 overflow-hidden"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderLeftWidth: '3px',
          borderLeftColor: isReply ? 'var(--color-border)' : color,
          padding: isReply ? '0.75rem' : '1rem',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: `${color}20`, color }}
            >
              {msg.author[0]}
            </span>
            <div className="min-w-0">
              <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {msg.author}
              </span>
              {msg.tag && (
                <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>{msg.tag}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {msg.pinned ? <span className="text-xs" style={{ color: '#FFC107' }} title="置頂留言">📌</span> : null}
            {!isReply && msg.category && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
                {msg.category}
              </span>
            )}
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {timeAgo(msg.created_at)}{msg.edited_at && ' (已編輯)'}
            </span>
          </div>
        </div>

        {/* Content area */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              disabled={editSaving}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{editContent.length}/2000</span>
              <div className="flex items-center gap-2">
                <button onClick={handleCancel} disabled={editSaving}
                  className="px-3 py-1.5 rounded-lg text-xs transition-opacity"
                  style={{ background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', opacity: editSaving ? 0.6 : 1 }}>
                  取消
                </button>
                <button onClick={handleSave} disabled={editSaving}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
                  style={{ background: 'var(--color-primary)', color: '#fff', opacity: editSaving ? 0.6 : 1 }}>
                  {editSaving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        ) : msg.deleted_at ? (
          <div className="text-sm leading-relaxed italic" style={{ color: 'var(--color-text-muted)', background: 'rgba(255,77,106,0.05)', border: '1px solid rgba(255,77,106,0.15)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
            此留言已被刪除
          </div>
        ) : msg.report_count >= 3 ? (
          <div className="text-sm leading-relaxed italic" style={{ color: 'var(--color-text-muted)', background: 'rgba(255,77,106,0.05)', border: '1px solid rgba(255,77,106,0.15)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
            此留言因多次檢舉已隱藏
          </div>
        ) : (
          <>
            <div className="text-sm leading-relaxed break-words prose prose-sm max-w-none" style={{ color: 'var(--color-text-secondary)', overflowWrap: 'anywhere' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match && !String(children).includes('\n');
                    if (isInline) {
                      return <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--color-neon-green)' }} {...props}>{children}</code>;
                    }
                    return <code className="block p-3 rounded-lg text-xs font-mono overflow-x-auto" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-neon-blue)' }} {...props}>{children}</code>;
                  },
                  a({ href, children, ...props }) {
                    if (!href) return <span {...props}>{children}</span>;
                    const safe = sanitizeUrl(href);
                    if (!safe) return <span {...props}>{children}</span>;
                    return <a href={safe} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{ color: 'var(--color-neon-blue)' }}>{children}</a>;
                  },
                  img({ src, alt, ...props }) {
                    const safeSrc = sanitizeImgSrc(src);
                    if (!safeSrc) return null;
                    return <img src={safeSrc} alt={alt || ''} loading="lazy" style={{ maxWidth: '100%', height: 'auto', borderRadius: '0.5rem' }} />;
                  },
                }}
              >
                {sanitizeMarkdown(msg.content)}
              </ReactMarkdown>
            </div>
            {/* Action buttons */}
            <div className="flex items-center justify-end mt-2 gap-2 flex-wrap">
              {canPin && (
                <button onClick={handlePinToggle} disabled={pinLoading}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:opacity-80"
                  style={{ background: msg.pinned ? 'rgba(255, 193, 7, 0.1)' : 'transparent', color: msg.pinned ? '#FFC107' : 'var(--color-text-muted)', border: 'none', cursor: pinLoading ? 'not-allowed' : 'pointer', opacity: pinLoading ? 0.5 : 1 }}
                  title={msg.pinned ? '取消置頂' : '置頂留言'}>
                  {pinLoading ? '處理中...' : (msg.pinned ? '🔽 取消置頂' : '📌 置頂')}
                </button>
              )}
              {canModify && (
                <button onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:opacity-80"
                  style={{ background: 'transparent', color: 'var(--color-text-muted)', border: 'none', cursor: 'pointer' }} title="編輯留言">✏️</button>
              )}
              {canModify && (
                <button onClick={() => { if (confirm('確定要刪除這則留言嗎？')) onDelete(msg.id); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:opacity-80"
                  style={{ background: 'transparent', color: 'var(--color-text-muted)', border: 'none', cursor: 'pointer' }} title="刪除留言">🗑️</button>
              )}
              <button onClick={() => onToggleLike(msg.id, liked)} disabled={!isLoggedIn || isLikeLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
                style={{ background: liked ? 'rgba(255, 77, 106, 0.1)' : 'transparent', color: liked ? '#FF4D6A' : 'var(--color-text-muted)', cursor: !isLoggedIn || isLikeLoading ? 'not-allowed' : 'pointer', opacity: !isLoggedIn ? 0.5 : 1, border: 'none' }}
                title={!isLoggedIn ? '請先登入才能按讚' : liked ? '收回讚' : '按讚'}>
                <span style={{ fontSize: '14px' }}>{liked ? '❤️' : '🤍'}</span>
                <span>{msg.like_count > 0 ? msg.like_count : ''}</span>
              </button>
              {!isReply && isLoggedIn && (
                <button onClick={() => setShowReplyForm(!showReplyForm)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:opacity-80"
                  style={{ background: 'transparent', color: 'var(--color-text-muted)', border: 'none', cursor: 'pointer' }} title="回覆留言">
                  💬 回覆{replyCount > 0 ? ` (${replyCount})` : ''}
                </button>
              )}
              {isLoggedIn && (
                msg.reported_by_me
                  ? <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.5, border: 'none', cursor: 'default' }}>已檢舉</span>
                  : <button onClick={() => setShowReportDialog(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:opacity-80"
                      style={{ background: 'transparent', color: 'var(--color-text-muted)', border: 'none', cursor: 'pointer' }} title="檢舉留言">🚩</button>
              )}
            </div>
          </>
        )}

        {/* Report dialog */}
        {showReportDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => { setShowReportDialog(false); setReportReason(''); }}>
            <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>🚩 檢舉留言</h4>
                <button onClick={() => { setShowReportDialog(false); setReportReason(''); }}
                  style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>請填寫檢舉原因，我們會儘快審核。</p>
              <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="檢舉原因..." rows={3} maxLength={500}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-3"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => { setShowReportDialog(false); setReportReason(''); }} disabled={reportSubmitting}
                  className="px-3 py-1.5 rounded-lg text-xs transition-opacity"
                  style={{ background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>取消</button>
                <button
                  onClick={async () => {
                    if (!reportReason.trim()) return;
                    setReportSubmitting(true);
                    onReport(msg.id, reportReason.trim());
                    setShowReportDialog(false);
                    setReportReason('');
                    setReportSubmitting(false);
                  }}
                  disabled={reportSubmitting || !reportReason.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity"
                  style={{ background: '#E94560', opacity: reportSubmitting || !reportReason.trim() ? 0.6 : 1 }}>
                  {reportSubmitting ? '送出中...' : '送出檢舉'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inline reply form */}
      {showReplyForm && isLoggedIn && (
        <div className="ml-6 mt-1">
          <ReplyForm
            parentId={msg.id}
            onReply={async (pid, content) => { await onReply(pid, content); setShowReplyForm(false); }}
            onCancel={() => setShowReplyForm(false)}
            authorName={currentUser?.name ?? ''}
          />
        </div>
      )}

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="ml-6 mt-2 space-y-2" style={{ borderLeft: '2px solid var(--color-border)', paddingLeft: '12px' }}>
          {replies.map((reply) => (
            <MessageCard
              key={reply.id}
              msg={reply}
              isReply={true}
              likedIds={likedIds}
              onToggleLike={onToggleLike}
              isLoggedIn={isLoggedIn}
              likeLoadingIds={likeLoadingIds}
              currentUser={currentUser}
              onDelete={onDelete}
              onEdit={onEdit}
              onPinToggle={onPinToggle}
              onReport={onReport}
              replies={[]}
              replyCount={0}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </>
  );
}
