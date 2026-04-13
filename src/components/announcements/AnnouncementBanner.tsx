import { useState, useEffect } from 'react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  author_name: string | null;
  created_at: string;
}

interface Props {
  dismissKey?: string;
}

export default function AnnouncementBanner({ dismissKey = 'announcement-dismissed' }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(dismissKey);
    if (stored) {
      try {
        setDismissed(JSON.parse(stored));
      } catch {
        setDismissed([]);
      }
    }
    fetch('/api/announcements')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.announcements?.length > 0) {
          setAnnouncements(data.announcements);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, [dismissKey]);

  const active = announcements.filter((a) => !dismissed.includes(a.id));

  if (!visible || active.length === 0) return null;

  const banner = active[0];

  const dismiss = () => {
    const next = [...dismissed, banner.id];
    setDismissed(next);
    localStorage.setItem(dismissKey, JSON.stringify(next));
    const remaining = announcements.filter((a) => !next.includes(a.id));
    if (remaining.length > 0) {
      setAnnouncements(remaining);
    } else {
      setVisible(false);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl px-4 py-3 mb-6"
      style={{
        background: 'linear-gradient(135deg, #6C63FF20 0%, #00D9FF10 100%)',
        border: '1px solid #6C63FF40',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 text-xl">📢</div>
        <div className="flex-1 min-w-0">
          {banner.pinned && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full mr-2"
              style={{ background: '#6C63FF', color: '#fff' }}
            >
              📌 置頂
            </span>
          )}
          <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {banner.title}
          </span>
          <div className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
            {banner.content}
          </div>
          {banner.author_name && (
            <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {banner.author_name} · {new Date(banner.created_at).toLocaleString('zh-TW')}
            </div>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 p-1 rounded-lg text-xs transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-muted)', background: 'transparent' }}
          aria-label="關閉公告"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
