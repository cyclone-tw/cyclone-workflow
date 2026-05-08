// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import KnowledgeBoard from '../../src/components/knowledge/KnowledgeBoard';

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

describe('KnowledgeBoard — smoke', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mockUseAuth.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/knowledge')) return jsonOk({ entries: [] });
        if (url.includes('/api/tags')) return jsonOk({ tags: [] });
        if (url.includes('/api/members')) return jsonOk({ members: [] });
        return jsonOk({});
      }),
    );
  });

  it('shows empty state when no knowledge entries', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<KnowledgeBoard />);
    expect(
      await screen.findByText(/還沒有知識條目/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
  });

  it('shows logged-out empty hint when user is not logged in', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<KnowledgeBoard />);
    await screen.findByText(/還沒有知識條目/, {}, { timeout: 4000 });
    // Two elements match — the empty-state hint AND the CTA card. Both are
    // logged-out indicators, so just assert at least one rendered.
    expect(screen.getAllByText(/登入後即可投稿到知識庫/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows logged-in empty hint when user is logged in', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', name: 'Alice', effectiveRole: 'member' },
      loading: false,
    });
    render(<KnowledgeBoard />);
    await screen.findByText(/還沒有知識條目/, {}, { timeout: 4000 });
    expect(screen.getByText(/點擊.*投稿到知識庫.*來分享你的知識/)).toBeInTheDocument();
  });

  it('renders without crashing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<KnowledgeBoard />);
    expect(document.body.firstChild).toBeTruthy();
  });
});
