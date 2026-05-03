// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AdminPanel from '@/components/admin/AdminPanel';

// useAuth is the auth gate. Mock it per-test to drive scenarios.
const mockUseAuth = vi.fn();
vi.mock('@/components/auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

function makeJsonResponse(body: unknown, ok = true): Response {
  return new Response(JSON.stringify({ ok, ...(body as object) }), {
    status: ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AdminPanel — auth gate smoke', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mockUseAuth.mockReset();
    // Default: every fetch returns empty success; admin path needs this to not crash.
    // SiteStats requires all 5 keys (see src/components/admin/types.ts STAT_ITEMS).
    const emptyStats = {
      totalUsers: 0, totalCheckins: 0, totalKnowledge: 0, totalWishes: 0, totalMessages: 0,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/stats')) return Promise.resolve(makeJsonResponse({ stats: emptyStats }));
        if (url.includes('/users')) return Promise.resolve(makeJsonResponse({ users: [] }));
        if (url.includes('/analytics')) return Promise.resolve(makeJsonResponse({ analytics: null }));
        if (url.includes('/announcements')) return Promise.resolve(makeJsonResponse({ announcements: [] }));
        if (url.includes('/messages')) return Promise.resolve(makeJsonResponse({ messages: [], total: 0 }));
        if (url.includes('/reports')) return Promise.resolve(makeJsonResponse({ reports: [], total: 0 }));
        return Promise.resolve(makeJsonResponse({}));
      }),
    );
  });

  it('shows spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null, loading: true, login: vi.fn(), isRole: () => false,
    });
    render(<AdminPanel />);
    // No "管理後台" header, no permission denied — just a spinner. Use animate-spin selector.
    expect(screen.queryByText('管理後台')).not.toBeInTheDocument();
    expect(screen.queryByText('需要管理員權限')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows "需要管理員權限" + login button when not logged in', () => {
    mockUseAuth.mockReturnValue({
      user: null, loading: false, login: vi.fn(), isRole: () => false,
    });
    render(<AdminPanel />);
    expect(screen.getByText('需要管理員權限')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
  });

  it('shows "需要管理員權限" without login button for non-admin signed-in user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', name: 'Alice' }, loading: false, login: vi.fn(),
      isRole: (role: string) => role !== 'admin',
    });
    render(<AdminPanel />);
    expect(screen.getByText('需要管理員權限')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '登入' })).not.toBeInTheDocument();
  });

  it('renders admin header after data loads when authenticated as admin', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', name: 'Admin' }, loading: false, login: vi.fn(),
      isRole: (role: string) => role === 'admin',
    });
    render(<AdminPanel />);
    expect(await screen.findByText('管理後台', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText('成員、角色與站點統計')).toBeInTheDocument();
  });
});
