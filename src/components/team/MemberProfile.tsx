import { useState, useEffect } from 'react';

interface Member {
  id: string;
  name: string;
  display_name: string;
  bio: string;
  avatar: string;
  color: string;
  role: string;
  groupRole: string;
}

interface AiTool {
  id: number;
  name: string;
  description: string;
  url: string;
  category: string;
  upvotes: number;
  created_at: string;
}

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  icon: string;
  upvotes: number;
  url: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  captain: '隊長',
  tech: '技術維護',
  admin: '行政協作',
  member: '正式隊員',
  companion: '陪跑員',
};

const CATEGORY_LABELS: Record<string, string> = {
  agent: 'Agent',
  llm: 'LLM',
  productivity: '生產力',
  dev: '開發',
  other: '其他',
  template: '工作流模板',
  'best-practice': '最佳實踐',
  qa: '問答精華',
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  return `${Math.floor(diff / 2592000)} 個月前`;
}

const SAFE_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
function safeColor(c: string | undefined): string {
  if (!c || !SAFE_COLOR_RE.test(c)) return '#6B7280';
  return c;
}

export default function MemberProfile({ memberId }: { memberId: string }) {
  const [member, setMember] = useState<Member | null>(null);
  const [aiTools, setAiTools] = useState<AiTool[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [memberRes, toolsRes, knowledgeRes] = await Promise.all([
          fetch(`/api/members/${encodeURIComponent(memberId)}`),
          fetch(`/api/ai-tools?contributor_id=${encodeURIComponent(memberId)}`),
          fetch(`/api/knowledge?contributor_id=${encodeURIComponent(memberId)}`),
        ]);

        const memberData = await memberRes.json();
        const toolsData = await toolsRes.json();
        const knowledgeData = await knowledgeRes.json();

        if (memberData.ok && memberData.member) {
          setMember(memberData.member);
        }
        if (toolsData.ok) setAiTools(toolsData.tools || []);
        if (knowledgeData.ok) setKnowledge(knowledgeData.entries || []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [memberId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full animate-pulse bg-[var(--color-bg-surface)] mx-auto mb-4" />
          <div className="h-8 w-48 animate-pulse bg-[var(--color-bg-surface)] mx-auto rounded" />
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-[var(--color-text-muted)]">找不到該成員或載入失敗</p>
        <a href="/team" className="text-[var(--color-primary)] hover:underline mt-4 inline-block">← 返回團隊頁</a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back link */}
      <a href="/team" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors mb-6 inline-block">
        ← 返回團隊頁
      </a>

      {/* Member Info Card */}
      <div
        className="glass rounded-2xl p-6 sm:p-8 mb-10"
        style={{ borderLeft: `4px solid ${safeColor(member.color)}` }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-5xl border-2"
            style={{ borderColor: safeColor(member.color), background: `${safeColor(member.color)}1A` }}
          >
            {member.avatar || '👤'}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mb-1">
              {member.display_name || member.name}
              {member.groupRole !== 'companion' && (
                <span className="text-sm font-normal ml-2" style={{ color: safeColor(member.color) }}>
                  {ROLE_LABELS[member.groupRole] || member.role}
                </span>
              )}
            </h1>
            {member.groupRole === 'companion' && (
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border mb-2"
                style={{ color: safeColor(member.color), borderColor: `${safeColor(member.color)}44`, background: `${safeColor(member.color)}18` }}
              >
                {ROLE_LABELS[member.groupRole] || member.role}
              </span>
            )}
            <p className="text-[var(--color-text-secondary)] mt-2 max-w-xl leading-relaxed">
              {member.bio || '這位成員還沒有填寫自我介紹。'}
            </p>
          </div>
        </div>
      </div>

      {/* AI Tools Section */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">🤖</span>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">AI 工具投稿</h2>
          <span className="text-sm text-[var(--color-text-muted)]">({aiTools.length})</span>
        </div>
        {aiTools.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center text-[var(--color-text-muted)]">
            尚無 AI 工具投稿
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {aiTools.map((tool) => (
              <a
                key={tool.id}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass rounded-xl p-4 hover:border-[var(--color-primary)] transition-colors block"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[var(--color-text-primary)] truncate">{tool.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-bg-surface)] text-[var(--color-text-muted)]">
                    {CATEGORY_LABELS[tool.category] || tool.category}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-3">{tool.description}</p>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span>👍 {tool.upvotes || 0}</span>
                  <span>{formatTimeAgo(tool.created_at)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Knowledge Section */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">📚</span>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">知識庫貢獻</h2>
          <span className="text-sm text-[var(--color-text-muted)]">({knowledge.length})</span>
        </div>
        {knowledge.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center text-[var(--color-text-muted)]">
            尚無知識庫貢獻
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {knowledge.map((entry) => (
              <a
                key={entry.id}
                href={`/knowledge`}
                className="glass rounded-xl p-4 hover:border-[var(--color-primary)] transition-colors block"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{entry.icon || '📘'}</span>
                  <h3 className="font-semibold text-[var(--color-text-primary)] truncate flex-1">{entry.title}</h3>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-3">{entry.content}</p>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-bg-surface)]">
                    {CATEGORY_LABELS[entry.category] || entry.category}
                  </span>
                  <span>{formatTimeAgo(entry.created_at)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
