import type { SiteStats } from '../types';
import { STAT_ITEMS, STAT_BORDER_COLORS } from '../types';

interface Props {
  stats: SiteStats | null;
}

export default function AdminStats({ stats }: Props) {
  if (!stats) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        站點統計
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {STAT_ITEMS.map(({ key, label, icon }) => (
          <div
            key={key}
            className="rounded-xl p-4"
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderLeftWidth: '3px',
              borderLeftColor: STAT_BORDER_COLORS[key],
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{icon}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {label}
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: STAT_BORDER_COLORS[key] }}>
              {stats[key].toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
