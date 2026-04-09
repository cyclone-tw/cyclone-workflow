export const SITE = {
  title: 'AI 工作流共學團',
  description: '26\'Q2 打造 AI 工作流 — 四週共學計畫',
  teamName: 'Cyclone 隊長 × 生活黑客共學團',
};

export interface Member {
  id: string;
  name: string;
  tag: string;
  role: string;
  avatar: string;
  color: string;
}

export const MEMBERS: Member[] = [
  { id: 'cyclone', name: 'Cyclone', tag: '#2707', role: '隊長 / 原PO', avatar: '🌀', color: '#6C63FF' },
  { id: 'benben', name: 'βenben', tag: '#0010', role: 'Z.ai', avatar: '🧪', color: '#00F5A0' },
  { id: 'dar', name: 'Dar', tag: '#3808', role: '技術開發', avatar: '⚡', color: '#00D9FF' },
  { id: 'benson', name: 'Benson', tag: '#2808', role: '企劃設計', avatar: '🎯', color: '#E94560' },
  { id: 'tiffanyhou', name: 'Tiffanyhou', tag: '#2623', role: '成員', avatar: '🦋', color: '#FF6B81' },
  { id: 'morning', name: '早安', tag: '#1329', role: '成員', avatar: '☀️', color: '#FFD93D' },
];

export const WEEKS = [
  { num: 1, title: '啟動', subtitle: '環境建置 & 第一個工作流', start: '2026-04-07' },
  { num: 2, title: '深化', subtitle: '語音輸入 & Agent Memory', start: '2026-04-14' },
  { num: 3, title: '交換', subtitle: 'Project 抽籤交換', start: '2026-04-21' },
  { num: 4, title: '展示', subtitle: '成果整理 & 發表', start: '2026-04-28' },
];

export const NAV_ITEMS = [
  { label: '首頁', href: '/', icon: '🏠' },
  { label: '儀表板', href: '/dashboard', icon: '📊' },
  { label: '團隊', href: '/team', icon: '👥' },
  { label: '知識庫', href: '/knowledge', icon: '📚' },
  { label: 'QA', href: '/qa', icon: '❓' },
  { label: '管家', href: '/agent', icon: '🏠' },
  { label: '許願樹', href: '/wishlist', icon: '🌳' },
  { label: '討論', href: '/discuss', icon: '💬' },
  { label: 'Issues', href: '/issue', icon: '📋' },
  { label: '說明', href: '/readme', icon: '📖' },
  { label: 'Bug', href: '/bug', icon: '🐛' },
  { label: '兌換區', href: '/exchange', icon: '🏪' },
  { label: 'AI 工具箱', href: '/ai-tools', icon: '🤖' },
];
