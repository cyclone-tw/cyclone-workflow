// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import IssueBoard from '../../src/components/issues/IssueBoard';

const mockUseAuth = vi.fn();
vi.mock('../../src/components/auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

function jsonOk(body: object) {
  return Promise.resolve(
    new Response(JSON.stringify({ ok: true, ...body }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('IssueBoard — smoke', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mockUseAuth.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: unknown) => {
        const u = typeof url === 'string' ? url : url instanceof Request ? url.url : String(url);
        if (u.includes('/api/issues')) return jsonOk({ issues: [] });
        if (u.includes('/api/github/issues')) return jsonOk({ issues: [] });
        return jsonOk({});
      }),
    );
  });

  it('renders without crashing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, login: vi.fn() });
    render(<IssueBoard />);
    // Empty / loading variant — at least the body shouldn't throw.
    // Component shows "載入中…" when issues are loading; auth-loading does not block render.
    expect(document.body.firstChild).toBeTruthy();
  });

  it('shows empty state text when no issues returned', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, login: vi.fn() });
    render(<IssueBoard />);
    expect(
      await screen.findByText('目前沒有符合條件的 Issues', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
  });

  it('does not show create-issue button when user is not logged in', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, login: vi.fn() });
    render(<IssueBoard />);
    await screen.findByText('目前沒有符合條件的 Issues', {}, { timeout: 4000 });
    // Logged-out: "新增 Issue" button must NOT be present.
    expect(screen.queryByRole('button', { name: /新增 Issue/ })).not.toBeInTheDocument();
  });

  it('shows create-issue button when user is logged in', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', name: 'Alice', effectiveRole: 'member' },
      loading: false, login: vi.fn(),
    });
    render(<IssueBoard />);
    expect(
      await screen.findByRole('button', { name: /新增 Issue/ }, { timeout: 4000 }),
    ).toBeInTheDocument();
  });
});
