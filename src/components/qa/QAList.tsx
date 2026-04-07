import { useState } from 'react';
import { decrypt, type EncryptedData } from '@/lib/crypto';

interface QAItem {
  id: string;
  title: string;
  author: string;
  authorTag: string;
  createdAt: string;
  encrypted: EncryptedData;
}

function QACard({ item }: { item: QAItem }) {
  const [password, setPassword] = useState('');
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleUnlock = async () => {
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const decrypted = await decrypt(item.encrypted, password);
      setContent(decrypted);
    } catch {
      setError('密碼錯誤，請重新輸入或求助 Cyclone 老師');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock();
  };

  return (
    <div
      className="rounded-xl border transition-all"
      style={{
        background: 'var(--color-bg-card)',
        borderColor: content ? 'var(--color-neon-green)' : 'var(--color-border)',
      }}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">{content ? '🔓' : '🔒'}</span>
          <div className="min-w-0">
            <h3
              className="font-semibold text-base leading-snug"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {item.title}
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              by {item.author} {item.authorTag} · {item.createdAt}
            </p>
          </div>
        </div>
        <svg
          className="w-5 h-5 flex-shrink-0 transition-transform"
          style={{
            color: 'var(--color-text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {content ? (
            <div
              className="mt-4 text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {content}
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                輸入密碼查看答案
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="請輸入密碼..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <button
                  onClick={handleUnlock}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? '解鎖中...' : '解鎖'}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-xs" style={{ color: 'var(--color-accent)' }}>
                  {error}
                </p>
              )}
              <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                忘記密碼？請求助 Cyclone 老師 🌀
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QAList({ items }: { items: QAItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <QACard key={item.id} item={item} />
      ))}
      {items.length === 0 && (
        <div
          className="text-center py-12 rounded-xl border"
          style={{
            background: 'var(--color-bg-card)',
            borderColor: 'var(--color-border)',
          }}
        >
          <p className="text-4xl mb-3">📭</p>
          <p style={{ color: 'var(--color-text-muted)' }}>還沒有 QA 項目</p>
        </div>
      )}
    </div>
  );
}
