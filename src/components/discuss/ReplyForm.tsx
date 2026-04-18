import { useState } from 'react';

interface ReplyFormProps {
  parentId: number;
  onReply: (parentId: number, content: string) => Promise<void>;
  onCancel: () => void;
  authorName: string;
}

export default function ReplyForm({ parentId, onReply, onCancel, authorName }: ReplyFormProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onReply(parentId, content.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        placeholder={`以 ${authorName} 回覆...`}
        rows={2}
        maxLength={2000}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none overflow-hidden"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          minHeight: '52px',
          resize: 'none',
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {content.length}/2000
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg text-xs transition-opacity"
            style={{
              background: 'transparent',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              opacity: submitting || !content.trim() ? 0.6 : 1,
            }}
          >
            {submitting ? '送出中...' : '送出回覆'}
          </button>
        </div>
      </div>
    </div>
  );
}
