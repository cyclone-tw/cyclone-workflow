/**
 * Admin 後台共享型別。抽出這層讓 tab 子元件可以獨立宣告 props,
 * 不必把 AdminPanel 的私有型別 re-export 一次。
 */

export interface SiteStats {
  totalUsers: number;
  totalCheckins: number;
  totalKnowledge: number;
  totalWishes: number;
  totalMessages: number;
}

export interface Analytics {
  activeUsers: { value: string; sessions: string; avgSessionDuration: string; bounceRate: string };
  pageviews30d: string;
  topPages: Array<{ path: string; views: string; users: string }>;
  trafficSources: Array<{ source: string; sessions: string; users: string }>;
  error: string | null;
}

export interface AdminMessage {
  id: number;
  author: string;
  author_id: string | null;
  author_name: string | null;
  content: string;
  category: string;
  tag: string;
  pinned: number;
  like_count: number;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface AdminReport {
  id: number;
  message_id: number;
  reporter_id: string;
  reason: string;
  status: 'pending' | 'resolved';
  created_at: string;
  message_content: string | null;
  message_author: string | null;
  reporter_name: string | null;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  discord_id: string | null;
  status: 'active' | 'pending';
  archived_at: string | null;
  updated_at: string | null;
  roles: string[];
  display_name: string;
  emoji: string;
  color: string;
  bio: string;
}

export interface RelatedCounts {
  checkins: number;
  wishes: number;
  knowledge: number;
  likes: number;
  sessions: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  author_id: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export const STAT_ITEMS: { key: keyof SiteStats; label: string; icon: string }[] = [
  { key: 'totalUsers', label: '總成員數', icon: '👥' },
  { key: 'totalCheckins', label: '打卡次數', icon: '✅' },
  { key: 'totalKnowledge', label: '知識條目', icon: '📚' },
  { key: 'totalWishes', label: '願望數量', icon: '🌳' },
  { key: 'totalMessages', label: '討論留言', icon: '💬' },
];

export const STAT_BORDER_COLORS: Record<string, string> = {
  totalUsers: '#6C63FF',
  totalCheckins: '#00F5A0',
  totalKnowledge: '#00D9FF',
  totalWishes: '#A78BFA',
  totalMessages: '#E94560',
};
