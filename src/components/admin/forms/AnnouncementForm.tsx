import { useState } from 'react';
import { FormField, FormStyles } from '../shared';
import type { Announcement } from '../types';

interface Props {
  announcement: Announcement | null;
  onSubmit: (body: { title: string; content: string; pinned: boolean }) => Promise<void>;
  onCancel: () => void;
}

export default function AnnouncementForm({ announcement, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [content, setContent] = useState(announcement?.content ?? '');
  const [pinned, setPinned] = useState(announcement?.pinned ?? false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        setSubmitting(true);
        try {
          await onSubmit({ title: title.trim(), content: content.trim(), pinned });
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-3"
    >
      <FormField label="標題 *">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="form-input"
          placeholder="公告標題"
        />
      </FormField>
      <FormField label="內容 *">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={4}
          className="form-input resize-none"
          placeholder="公告內容"
        />
      </FormField>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="w-4 h-4 accent-[#6C63FF]"
        />
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          📌 置頂公告
        </span>
      </label>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{
            background: 'var(--color-bg-dark)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting || !title.trim() || !content.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {submitting ? '儲存中...' : '儲存'}
        </button>
      </div>
      <FormStyles />
    </form>
  );
}
