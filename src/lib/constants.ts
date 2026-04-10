export const SITE = {
  title: 'AI 工作流共學團',
  description: '把 AI 真的用起來 — 三週共學計畫',
  teamName: 'Cyclone 隊長 × 生活黑客共學團',
};

export type GroupRole = 'captain' | 'tech' | 'admin' | 'member' | 'companion';

export interface Member {
  id: string;
  name: string;
  tag: string;
  role: string;
  avatar: string;
  color: string;
  groupRole: GroupRole;
  intro?: string;
}

export const ROLE_GROUPS: { key: GroupRole; label: string; icon: string; color: string }[] = [
  { key: 'tech', label: '技術維護', icon: '🔧', color: '#00D9FF' },
  { key: 'captain', label: '隊長', icon: '🌀', color: '#6C63FF' },
  { key: 'admin', label: '行政協作', icon: '📝', color: '#00F5A0' },
  { key: 'member', label: '正式隊員', icon: '🎯', color: '#E94560' },
  { key: 'companion', label: '陪跑員', icon: '🏃', color: '#A78BFA' },
];

export const MEMBERS: Member[] = [
  // 隊長
  { id: 'cyclone', name: 'Cyclone', tag: '#2707', role: '隊長', avatar: '🐉', color: '#94A3B8', groupRole: 'captain', intro: '想運用 AI 讓自己可以更悠哉活得更優雅' },

  // 技術維護
  { id: 'dar', name: 'Dar', tag: '#3808', role: '技術維護', avatar: '💆', color: '#166534', groupRole: 'tech', intro: '想用 AI 健康長壽' },
  { id: 'benben', name: 'Benben', tag: '', role: '技術維護', avatar: '🦄', color: '#A78BFA', groupRole: 'tech', intro: 'hello world' },

  // 行政協作
  { id: 'tiffanyhou', name: 'Tiffanyhou', tag: '#2623', role: '行政協作', avatar: '🐋', color: '#A78BFA', groupRole: 'admin', intro: '我要做 Agent' },
  { id: 'sandy', name: '珊迪', tag: '', role: '行政協作', avatar: '🐹', color: '#00F5A0', groupRole: 'admin', intro: '想用 AI Agent 自動化管理共學團的流程；輔助學習筆記中化輸入為輸出的過程' },

  // 正式隊員
  { id: 'benson', name: 'Benson', tag: '', role: '陪跑員', avatar: '🎏', color: '#6C63FF', groupRole: 'companion', intro: '謙虛地過每一天，好好學習，好好生活' },
  { id: 'chijie', name: '志傑', tag: '', role: '正式隊員', avatar: '☀️', color: '#1E3A8A', groupRole: 'member', intro: '接觸 n8n、OpenClaw 等工具，希望透過學習讓 AI 更活用在工作上' },
  { id: 'cake', name: '蛋糕', tag: '', role: '正式隊員', avatar: '🍰', color: '#FF6B6B', groupRole: 'member', intro: '想要用 AI 打造自己的工作流' },
  { id: 'winnie', name: '維尼熊', tag: '', role: '正式隊員', avatar: '🐝', color: '#FFD93D', groupRole: 'member', intro: '想把跟 AI 協作的方式升級成更聰明的方式' },
  { id: 'lucy', name: 'Lucy', tag: '', role: '正式隊員', avatar: '🍄', color: '#FFD93D', groupRole: 'member', intro: '第十屆訓練營結業生，希望大家一起前進' },
  { id: 'myra', name: 'Myra', tag: '#2716', role: '正式隊員', avatar: '🙏', color: '#A78BFA', groupRole: 'member', intro: '13 年活動企劃，好奇心求知慾讓我熱愛學習' },

  // 陪跑員
  { id: 'vision', name: 'Vision', tag: '獻謚', role: '陪跑員', avatar: '⭐', color: '#00F5A0', groupRole: 'companion', intro: '軟體工程師，想用 AI、Notion 和 Claude Code 打造自動化工作流程' },
  { id: 'yawen', name: '雅雯', tag: '', role: '陪跑員', avatar: '🎨', color: '#6C63FF', groupRole: 'companion', intro: '想來了解 AI 工作流到底能多強大' },
  { id: 'annie', name: '安妮想要飛', tag: '', role: '陪跑員', avatar: '🚀', color: '#00D9FF', groupRole: 'companion', intro: '想用 AI 解決我懶得做的事' },
  { id: 'innoblue', name: 'innoblue', tag: '', role: '陪跑員', avatar: '😎', color: '#1E3A8A', groupRole: 'companion', intro: '一起學 AI' },
  { id: 'twentysix', name: '26', tag: '', role: '陪跑員', avatar: '🫪', color: '#94A3B8', groupRole: 'companion', intro: '我是 26！' },
  { id: 'qiying', name: '琪穎', tag: '', role: '陪跑員', avatar: '🐧', color: '#FF8FAB', groupRole: 'companion', intro: '來自馬來西亞的國小教師，正在研究 Claude AI' },
  { id: 'ck', name: 'CK', tag: '', role: '陪跑員', avatar: '⚾', color: '#1E3A8A', groupRole: 'companion', intro: '利用 AI agent 串接不同平台及自動化' },
  { id: 'shunzi', name: '舜子', tag: '', role: '陪跑員', avatar: '🎤', color: '#A78BFA', groupRole: 'companion', intro: '想用 AI 來達成工作與生活中的平衡' },
  { id: 'ding', name: 'Ding', tag: '', role: '陪跑員', avatar: '🐶', color: '#FFD93D', groupRole: 'companion', intro: '想透過共學找到用 AI 改善工作流的靈感' },
  { id: 'lucia', name: 'Lucia', tag: '', role: '陪跑員', avatar: '👻', color: '#A78BFA', groupRole: 'companion', intro: '想用 AI 打造分身' },
  { id: 'panda', name: '熊貓', tag: '', role: '陪跑員', avatar: '🐼', color: '#94A3B8', groupRole: 'companion', intro: 'AI 初學者，想學習如何設計 AI 協助處理重複性任務' },
  { id: 'rupert', name: 'Rupert', tag: '', role: '陪跑員', avatar: '🐸', color: '#166534', groupRole: 'companion', intro: 'AI agent user，使用 OpenClaw + Claude Code 處理日常事務，最近在研究 Agent Skill' },
  { id: 'mengxuan', name: '孟璇', tag: '', role: '陪跑員', avatar: '🐈', color: '#94A3B8', groupRole: 'companion', intro: '設計領域多年，想成為一邊偷懶一邊專注創作的新人類' },
  { id: 'beast', name: 'Beast', tag: '', role: '陪跑員', avatar: '🐻', color: '#FF8FAB', groupRole: 'companion', intro: '想一起創造好玩的生活' },
  { id: 'maggie', name: 'Maggie', tag: '#0696', role: '陪跑員', avatar: '👣', color: '#FF6B6B', groupRole: 'companion', intro: '愛吃也愛做、愛學也愛遊玩，正在學習把人生活得更好玩' },
  { id: 'rycen', name: 'Rycen', tag: '', role: '陪跑員', avatar: '🦥', color: '#A78BFA', groupRole: 'companion', intro: '十屆訓練營的樹懶' },
  { id: 'muye', name: '牧野悠', tag: '', role: '陪跑員', avatar: '🔮', color: '#FF6B6B', groupRole: 'companion', intro: 'BIMer，一秒熱度停滯者，心血來潮手搓黑洞' },
  { id: 'jerry', name: 'Jerry', tag: '', role: '陪跑員', avatar: '🏄', color: '#6C63FF', groupRole: 'companion', intro: '想看大家如何運用 AI 解決不同問題，去想像力到不了的地方' },
];

export const WEEKS = [
  { num: 0, title: '預備週', subtitle: '環境準備：網站上線、成員到齊', start: '2026-04-10', end: '2026-04-12', goals: [] },
  { num: 1, title: '盤點與定義', subtitle: '釐清需求、盤點工具、確認主題', start: '2026-04-13', end: '2026-04-19', goals: ['釐清自己的需求與痛點', '盤點手邊的 AI 工具與訂閱', '確認安裝與環境設定', '找到三週內要做的主題'] },
  { num: 2, title: '做出雛形', subtitle: '產出 MVP，從想法進入實作', start: '2026-04-20', end: '2026-04-26', goals: ['產出最小可行作品（MVP）', '至少有骨架 / 原型', '開始接觸 GitHub / 發布', '從「想法」進入「有東西可以展示」'] },
  { num: 3, title: '成果展示', subtitle: '展示作品、分享過程、收束回顧', start: '2026-04-27', end: '2026-05-04', goals: ['展示作品', '說明解決了什麼問題', '分享卡點、解法與過程', '完成三週共學的收束與回顧'] },
];

export const NAV_ITEMS = [
  { label: '首頁', href: '/', icon: '🏠' },
  { label: '說明', href: '/readme', icon: '📖' },
  { label: '儀表板', href: '/dashboard', icon: '📊' },
  { label: '積分榜', href: '/leaderboard', icon: '🏆' },
  { label: '團隊', href: '/team', icon: '👥' },
  { label: '知識庫', href: '/knowledge', icon: '📚' },
  { label: 'AI工具箱', href: '/ai-tools', icon: '🤖' },
  { label: '管家', href: '/agent', icon: '🎩' },
  { label: '許願樹', href: '/wishlist', icon: '🌳' },
  { label: '討論', href: '/discuss', icon: '💬' },
  { label: 'Issues', href: '/issue', icon: '📋' },
  { label: 'Bug', href: '/bug', icon: '🐛' },
];
