import { useState } from 'react';
import type { Analytics } from '../types';

interface Props {
  analytics: Analytics | null;
}

export default function AdminAIInsights({ analytics }: Props) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  if (!analytics || analytics.error) return null;

  async function fetchInsights() {
    setLoading(true);
    setError(null);
    setInsights(null);
    try {
      const res = await fetch('/api/admin/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analytics }),
      });
      const data = await res.json() as { ok: boolean; insights?: string; error?: string; quotaExceeded?: boolean };
      if (res.status === 429 || data.quotaExceeded) {
        setQuotaExceeded(true);
        setError(data.error || 'API 用量已滿，請稍後再試。');
        return;
      }
      if (!data.ok) throw new Error(data.error || 'AI 分析失敗');
      setInsights(data.insights!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 分析失敗');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          🤖 AI 分析建議
        </h2>
        <button
          onClick={fetchInsights}
          disabled={loading || quotaExceeded}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #00D9FF)', color: '#fff' }}
        >
          {loading ? '分析中...' : quotaExceeded ? '用量已滿' : '生成 AI 建議'}
        </button>
      </div>

      {loading && (
        <div className="rounded-xl p-6 flex items-center justify-center gap-3" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
          <div className="w-5 h-5 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>正在分析數據，請稍候...</span>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: quotaExceeded ? '#FF980020' : '#E9456020', border: `1px solid ${quotaExceeded ? '#FF980040' : '#E9456040'}`, color: quotaExceeded ? '#FF9800' : '#E94560' }}>
          {error}
        </div>
      )}

      {insights && !loading && (
        <div
          className="rounded-xl p-5 space-y-2 text-sm"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          {insights.split('\n').map((line, i) => {
            const headingMatch = line.match(/^###\s+(\d+)\.\s+(.+)/);
            if (headingMatch) {
              return (
                <h3 key={i} className="font-semibold mt-4 first:mt-0" style={{ color: '#6C63FF' }}>
                  {headingMatch[1]}. {headingMatch[2]}
                </h3>
              );
            }
            if (line.startsWith('→')) {
              return <p key={i} style={{ color: '#00D9FF' }}>{line}</p>;
            }
            if (line.trim() === '') return <div key={i} className="h-1" />;
            return <p key={i} style={{ color: 'var(--color-text-secondary)' }}>{line}</p>;
          })}
        </div>
      )}
    </section>
  );
}
