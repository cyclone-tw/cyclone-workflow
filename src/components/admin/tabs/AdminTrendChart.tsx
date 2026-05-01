import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TrendPoint {
  date: string;
  activeUsers: number;
  pageviews: number;
}

interface Props {
  dailyTrend: TrendPoint[];
}

function formatDate(raw: string): string {
  if (raw.length !== 8) return raw;
  return `${raw.slice(4, 6)}/${raw.slice(6, 8)}`;
}

export default function AdminTrendChart({ dailyTrend }: Props) {
  if (!dailyTrend || dailyTrend.length === 0) return null;

  const data = dailyTrend.map((d) => ({ ...d, date: formatDate(d.date) }));

  return (
    <div
      className="rounded-xl p-4 mt-4"
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
        📈 流量趨勢（近 30 日）
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--color-text-primary)',
            }}
            labelStyle={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-muted)' }}
          />
          <Line
            type="monotone"
            dataKey="activeUsers"
            name="活躍用戶"
            stroke="#6C63FF"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="pageviews"
            name="瀏覽量"
            stroke="#00D9FF"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
