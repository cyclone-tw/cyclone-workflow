import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface Announcement {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  author_name: string | null;
  created_at: string;
}

interface AnnouncementsResponse {
  ok: true;
  announcements: Announcement[];
}

const MAX_VISIBLE = 3;

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    apiFetch<AnnouncementsResponse>('/api/announcements').then((result) => {
      if (result.ok && result.data.announcements?.length > 0) {
        setAnnouncements(result.data.announcements.slice(0, MAX_VISIBLE));
        setVisible(true);
      }
    });
  }, []);

  if (!visible || announcements.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {announcements.map((a) => (
        <div
          key={a.id}
          className="relative overflow-hidden rounded-xl px-4 py-3"
          style={{
            background: 'linear-gradient(135deg, #6C63FF20 0%, #00D9FF10 100%)',
            border: '1px solid #6C63FF40',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 text-xl">📢</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {a.pinned && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: '#6C63FF', color: '#fff' }}
                  >
                    📌 置頂
                  </span>
                )}
                <span className="font-medium" style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                  {a.title}
                </span>
              </div>
              <div
                className="mt-1"
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-line',
                  lineHeight: 1.5,
                }}
              >
                {a.content}
              </div>
              {a.author_name && (
                <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {a.author_name} · {new Date(a.created_at).toLocaleString('zh-TW')}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
