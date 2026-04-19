import { useState, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { GroupRole } from '@/lib/constants';

const ROLE_BADGE_COLORS: Record<GroupRole, string> = {
  captain: '#6C63FF',
  tech: '#00D9FF',
  admin: '#00F5A0',
  member: '#E94560',
  companion: '#A78BFA',
};

const ROLE_LABELS: Record<GroupRole, string> = {
  captain: '隊長',
  tech: '技術維護',
  admin: '行政協作',
  member: '正式隊員',
  companion: '陪跑員',
};

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

export default function LoginButton() {
  const { user, loading, login, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [menuOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [menuOpen]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[var(--color-overlay-neutral-strong)] animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={login}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
          bg-[var(--color-primary)] text-white
          hover:bg-[var(--color-primary-dark)] transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        <span className="hidden sm:inline">登入</span>
      </button>
    );
  }

  const roleColor = ROLE_BADGE_COLORS[user.effectiveRole] || '#9090B0';
  const roleLabel = ROLE_LABELS[user.effectiveRole] || user.effectiveRole;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg
          hover:bg-[var(--color-overlay-neutral-weak)] transition-colors"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.display_name || user.name}
            className="w-7 h-7 rounded-full object-cover ring-2 ring-[var(--color-border)]"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: roleColor }}
          >
            {getInitials(user.display_name || user.name)}
          </div>
        )}
        <span className="hidden sm:inline text-sm font-medium text-[var(--color-text-secondary)] max-w-[80px] truncate">
          {user.display_name || user.name}
        </span>
        <svg
          className={`w-3 h-3 text-[var(--color-text-muted)] transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-xl glass shadow-lg py-2 z-50
            border border-[var(--color-border)]"
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {user.display_name || user.name}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
              {user.email}
            </p>
            <span
              className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: roleColor }}
            >
              {roleLabel}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text-secondary)]
              hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-neutral-weak)]
              transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            登出
          </button>
        </div>
      )}
    </div>
  );
}
