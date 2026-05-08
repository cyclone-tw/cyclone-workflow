// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import WishBoard from '../../src/components/wishlist/WishBoard';

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

describe('WishBoard — smoke', () => {
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
        if (u.includes('/api/wishes')) return jsonOk({ wishes: [] });
        return jsonOk({});
      }),
    );
  });

  it('shows empty state when no wishes returned', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<WishBoard />);
    expect(
      await screen.findByText(/目前還沒有願望/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
  });

  it('does not show 許願 button when user is not logged in', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<WishBoard />);
    await screen.findByText(/目前還沒有願望/, {}, { timeout: 4000 });
    expect(screen.queryByRole('button', { name: '許願' })).not.toBeInTheDocument();
  });

  it('shows 許願 button when user is logged in', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', name: 'Alice', effectiveRole: 'member' },
      loading: false,
    });
    render(<WishBoard />);
    expect(
      await screen.findByRole('button', { name: '許願' }, { timeout: 4000 }),
    ).toBeInTheDocument();
  });

  it('renders without crashing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<WishBoard />);
    expect(document.body.firstChild).toBeTruthy();
  });
});
