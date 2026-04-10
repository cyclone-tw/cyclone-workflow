import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/useAuth';

interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  total_checkins: number;
  current_streak: number;
  total_points: number;
}

const RANK_STYLES: Record<number, { border: string; glow: string; bg: string; medal: string; size: string }> = {
  0: {
    border: 'border-[#FFD700]',
    glow: '0 0 20px rgba(255,215,0,0.3), 0 0 40px rgba(255,215,0,0.1)',
    bg: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,215,0,0.04) 100%)',
    medal: '🥇',
    size: 'w-28 h-28 text-5xl',
  },
  1: {
    border: 'border-[#C0C0C0]',
    glow: '0 0 16px rgba(192,192,192,0.3), 0 0 32px rgba(192,192,192,0.1)',
    bg: 'linear-gradient(135deg, rgba(192,192,192,0.12) 0%, rgba(192,192,192,0.04) 100%)',
    medal: '🥈',
    size: 'w-24 h-24 text-4xl',
  },
  2: {
    border: 'border-[#CD7F32]',
    glow: '0 0 14px rgba(205,127,50,0.3), 0 0 28px rgba(205,127,50,0.1)',
    bg: 'linear-gradient(135deg, rgba(205,127,50,0.12) 0%, rgba(205,127,50,0.04) 100%)',
    medal: '🥉',
    size: 'w-24 h-24 text-4xl',
  },
};

const EMOJI_FALLBACKS = ['🐉','💆','🦄','🐋','🐹','🎏','☀️','🍰','🐝','🍄','🙏','⭐','🎨','🚀','😎','🫪','🐧','⚾','🎤','🐶'];

function Avatar({ url, name, index, className }: { url: string | null; name: string; index: number; className?: string }) {
  if (url) {
    return <img src={url} alt={name} className={`${className || ''} rounded-full object-cover`} />;
  }
  return (
    <div className={`${className || ''} rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border)] flex items-center justify-center text-2xl`}>
      {EMOJI_FALLBACKS[index % EMOJI_FALLBACKS.length]}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      {/* Podium skeletons */}
      <div className="flex items-end justify-center gap-4 mb-10">
        <div className="w-36 h-44 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border)]" />
        <div className="w-36 h-56 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border)]" />
        <div className="w-36 h-44 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border)]" />
      </div>
      {/* Table skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)]" />
        ))}
      </div>
    </div>
  );
}

function PodiumCard({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const style = RANK_STYLES[rank];
  const isFirst = rank === 0;
  // Reorder: 2nd (rank 1) left, 1st (rank 0) center, 3rd (rank 2) right
  const orderClass = isFirst
    ? 'order-2 sm:order-2'
    : rank === 1
    ? 'order-1 sm:order-1'
    : 'order-3 sm:order-3';

  return (
    <div
      className={`${orderClass} flex flex-col items-center ${isFirst ? 'sm:-mt-6' : ''}`}
    >
      <div
        className={`
          rounded-2xl p-6 flex flex-col items-center border-2 transition-all
          ${style.border}
        `}
        style={{ boxShadow: style.glow, background: style.bg }}
      >
        <span className="text-3xl mb-3">{style.medal}</span>
        <div className="mb-3">
          <Avatar url={entry.avatar_url} name={entry.user_name} index={rank} className={style.size} />
        </div>
        <div className="text-base font-bold text-[var(--color-text-primary)] mb-1 text-center truncate max-w-[120px]">
          {entry.user_name}
        </div>
        <div className="text-2xl font-black mb-2" style={{ color: rank === 0 ? '#FFD700' : rank === 1 ? '#C0C0C0' : '#CD7F32' }}>
          {entry.total_points}
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] mb-2">分</div>
        <div className="flex gap-4 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <span>✅</span> {entry.total_checkins}
          </span>
          <span className="flex items-center gap-1">
            <span>🔥</span> {entry.current_streak}
          </span>
        </div>
      </div>
    </div>
  );
}

function LeaderboardTable({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string | undefined;
}) {
  return (
    <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[3rem_1fr_4rem_4rem_5rem] sm:grid-cols-[3.5rem_1fr_5rem_5rem_6rem] gap-2 px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
        <span>排名</span>
        <span>成員</span>
        <span className="text-center">打卡</span>
        <span className="text-center">連續</span>
        <span className="text-right">積分</span>
      </div>
      {/* Rows */}
      {entries.map((entry, i) => {
        const rank = i + 4; // starts from 4th
        const isMe = entry.user_id === currentUserId;
        return (
          <div
            key={entry.user_id}
            className={`
              grid grid-cols-[3rem_1fr_4rem_4rem_5rem] sm:grid-cols-[3.5rem_1fr_5rem_5rem_6rem] gap-2 px-4 py-3 items-center
              text-sm transition-colors
              ${isMe
                ? 'bg-[var(--color-primary)]/10 border-l-2 border-l-[var(--color-primary)]'
                : 'hover:bg-[var(--color-bg-surface)] border-l-2 border-l-transparent'
              }
            `}
          >
            <span className="text-[var(--color-text-muted)] font-mono text-xs">{rank}</span>
            <span className="flex items-center gap-2 min-w-0">
              <Avatar url={entry.avatar_url} name={entry.user_name} index={i + 3} className="w-7 h-7 text-base" />
              <span className={`truncate ${isMe ? 'text-[var(--color-primary-light)] font-semibold' : 'text-[var(--color-text-primary)]'}`}>
                {entry.user_name}
                {isMe && <span className="ml-1.5 text-[10px] text-[var(--color-primary)]">(你)</span>}
              </span>
            </span>
            <span className="text-center text-[var(--color-text-secondary)]">{entry.total_checkins}</span>
            <span className="text-center text-[var(--color-text-secondary)]">🔥 {entry.current_streak}</span>
            <span className="text-right font-bold text-[var(--color-text-primary)]">{entry.total_points}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function LeaderboardBoard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetch('/api/checkin/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.leaderboard) {
          setLeaderboard(data.leaderboard);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="glass rounded-2xl border border-[var(--color-border)] p-10 text-center">
        <div className="text-4xl mb-4">😵</div>
        <p className="text-[var(--color-text-secondary)] mb-2">無法載入積分榜</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors"
        >
          重新整理
        </button>
      </div>
    );
  }

  if (!leaderboard) {
    return <Skeleton />;
  }

  if (leaderboard.length === 0) {
    return (
      <div className="glass rounded-2xl border border-dashed border-[var(--color-border)] p-10 text-center">
        <div className="text-5xl mb-4">📭</div>
        <p className="text-[var(--color-text-secondary)] mb-2 font-medium">還沒有打卡紀錄</p>
        <p className="text-xs text-[var(--color-text-muted)]">成為第一個打卡的人吧！</p>
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const currentUserId = user?.id;

  return (
    <div>
      {/* Podium — 2nd | 1st | 3rd */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-4 sm:gap-6 mb-10">
          {top3.map((entry, i) => (
            <PodiumCard key={entry.user_id} entry={entry} rank={i} />
          ))}
        </div>
      )}

      {/* Remaining entries */}
      {rest.length > 0 && (
        <LeaderboardTable entries={rest} currentUserId={currentUserId} />
      )}

      {/* Show current user if logged in but not in top 20 */}
      {user && !leaderboard.some((e) => e.user_id === user.id) && (
        <div className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          開始打卡，登上積分榜！
        </div>
      )}
    </div>
  );
}
