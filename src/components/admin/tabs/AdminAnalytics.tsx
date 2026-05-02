import type { Analytics } from '../types';
import AdminTrendChart from './AdminTrendChart';

interface Props {
  analytics: Analytics | null;
}

function formatDuration(secondsStr: string): string {
  const totalSeconds = Math.round(parseFloat(secondsStr));
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '0 秒';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;
}

function formatBounceRate(rateStr: string): string {
  const rate = parseFloat(rateStr);
  if (isNaN(rate)) return '0%';
  return `${(rate * 100).toFixed(2)}%`;
}

function translateSource(source: string): string {
  const map: Record<string, string> = {
    'Unassigned': '未分類',
    '(not set)': '未分類',
    '(direct)': '直接連結',
    'Organic Search': '自然搜尋',
    'Direct': '直接連結',
    'Referral': '引薦',
    'Social': '社群',
    'Paid Search': '付費搜尋',
    'Email': '電子郵件',
    'Affiliated': '聯盟',
    'Display': '多媒體廣告',
  };
  return map[source] ?? source;
}

function formatNumber(numStr: string): string {
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return '0';
  return num.toLocaleString();
}

export default function AdminAnalytics({ analytics }: Props) {
  if (!analytics) return null;

  if (analytics.error) {
    return (
      <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#E9456020', border: '1px solid #E9456040', color: '#E94560' }}>
        {analytics.error}
        <br />
        <span className="text-xs opacity-70">請確認 Google Cloud Console 已啟用 Analytics Data API，且 API Key 有該 API 的使用權限。</span>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        📊 Google Analytics（近 7 日）
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderLeftWidth: '3px', borderLeftColor: '#6C63FF' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>活躍用戶</div>
          <p className="text-2xl font-bold" style={{ color: '#6C63FF' }}>{analytics.activeUsers.value}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderLeftWidth: '3px', borderLeftColor: '#00F5A0' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>工作階段</div>
          <p className="text-2xl font-bold" style={{ color: '#00F5A0' }}>{formatNumber(analytics.activeUsers.sessions)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderLeftWidth: '3px', borderLeftColor: '#00D9FF' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>平均停留時間</div>
          <p className="text-2xl font-bold" style={{ color: '#00D9FF' }}>{formatDuration(analytics.activeUsers.avgSessionDuration)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderLeftWidth: '3px', borderLeftColor: '#E94560' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>跳出率</div>
          <p className="text-2xl font-bold" style={{ color: '#E94560' }}>{formatBounceRate(analytics.activeUsers.bounceRate)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>熱門頁面</div>
          <div className="space-y-1">
            {analytics.topPages.slice(0, 5).map((p) => (
              <div key={p.path} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>
                  <a href={`https://cyclone.tw${p.path}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{p.path}</a>
                </span>
                <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{parseInt(p.views).toLocaleString()} 瀏覽</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>流量來源</div>
          <div className="space-y-1">
            {analytics.trafficSources.slice(0, 5).map((s) => (
              <div key={s.source} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>{translateSource(s.source)}</span>
                <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatNumber(s.sessions)} 工作階段</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl px-4 py-2 text-xs" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
        30 日總瀏覽量：{parseInt(analytics.pageviews30d).toLocaleString()}
      </div>
      <AdminTrendChart dailyTrend={analytics.dailyTrend} />
    </section>
  );
}
