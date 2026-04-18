import { useState, useEffect } from 'react';
import { MEMBERS } from '@/lib/constants';

const MEMBER_SLUG_MAP = new Map<string, string>();
MEMBERS.forEach((m) => MEMBER_SLUG_MAP.set(m.name.toLowerCase(), m.id));

function getMemberSlug(displayName: string, name: string, id: string): string {
  return MEMBER_SLUG_MAP.get((displayName || name).toLowerCase()) || id;
}


interface TeamMember {
  id: string;
  name: string;
  tag: string;
  role: string;
  avatar: string;
  color: string;
  groupRole: string;
  display_name: string;
  bio: string;
}

const ROLE_GROUPS = [
  { key: 'captain', label: '隊長', icon: '👑', color: '#6C63FF' },
  { key: 'tech', label: '技術維護', icon: '🛠️', color: '#00D9FF' },
  { key: 'admin', label: '行政協作', icon: '📋', color: '#00F5A0' },
  { key: 'member', label: '正式隊員', icon: '⭐', color: '#E94560' },
  { key: 'companion', label: '陪跑員', icon: '🌱', color: '#A78BFA' },
];

export default function TeamBoard() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          // Deduplicate: same person may have both legacy and OAuth accounts
          const seen = new Set<string>();
          const unique = (data.members as TeamMember[]).filter((m: TeamMember) => {
            if (seen.has(m.name)) return false;
            seen.add(m.name);
            return true;
          });
          setMembers(unique);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const grouped = ROLE_GROUPS.map((group) => ({
    ...group,
    members: members.filter((m) => m.groupRole === group.key),
  })).filter((g) => g.members.length > 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">👥 共學團成員</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg">載入中...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-[var(--color-text-muted)]">載入成員失敗，請稍後再試</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="text-center mb-14">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          <span className="gradient-text">👥 共學團成員</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg max-w-2xl mx-auto">
          {members.length} 位成員，一起探索 AI 工作流的無限可能。三週共學，互相激盪，共同成長。
        </p>
      </div>

      {/* Role Groups */}
      {grouped.map((group) => (
        <section key={group.key} className="mb-16">
          {/* Group Header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${group.color}20`, border: `1px solid ${group.color}40` }}
            >
              {group.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{group.label}</h2>
              <p className="text-xs text-[var(--color-text-muted)]">{group.members.length} 人</p>
            </div>
            <div className="flex-1 h-px bg-[var(--color-border)] ml-4" />
          </div>

          {/* Member Cards Grid */}
          <div
            className={`grid gap-4 ${
              group.key === 'companion'
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {group.members.map((member) => (
              <div
                key={member.id}
                className="glass card-hover rounded-2xl p-5 flex flex-col items-center text-center group cursor-default"
                style={{ '--member-color': member.color } as React.CSSProperties}
              >
                {/* Avatar with glow ring */}
                <div
                  className="relative mb-4"
                  style={{ filter: `drop-shadow(0 0 12px ${member.color}44)` }}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2 transition-all duration-300 group-hover:scale-110"
                    style={{
                      borderColor: member.color,
                      background: `${member.color}1A`,
                    }}
                  >
                    {member.avatar || '👤'}
                  </div>
                </div>

                {/* Name + Tag */}
                <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1">
                  {member.display_name || member.name}
                  {member.tag && (
                    <span className="text-xs font-normal ml-1" style={{ color: member.color }}>
                      {member.tag}
                    </span>
                  )}
                </h3>

                {/* Role Badge */}
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border mb-2"
                  style={{
                    color: member.color,
                    borderColor: `${member.color}44`,
                    background: `${member.color}18`,
                  }}
                >
                  {member.role}
                </span>

                {/* Bio */}
                {member.bio && (
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-1 line-clamp-2">
                    {member.bio}
                  </p>
                )}

                {/* View Profile Button */}
                <a
                  href={`/team/${getMemberSlug(member.display_name, member.name, member.id)}`}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    background: `${member.color}15`,
                    color: member.color,
                    border: `1px solid ${member.color}30`,
                  }}
                >
                  查看空間 →
                </a>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
