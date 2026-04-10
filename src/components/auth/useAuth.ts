import { useState, useEffect, useCallback } from 'react';
import type { GroupRole } from '@/lib/constants';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  roles: GroupRole[];
  effectiveRole: GroupRole;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

const ROLE_HIERARCHY: GroupRole[] = ['captain', 'tech', 'admin', 'member', 'companion'];

function hasRole(user: AuthUser | null, role: GroupRole): boolean {
  if (!user) return false;
  const userLevel = ROLE_HIERARCHY.indexOf(user.effectiveRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(role);
  return userLevel <= requiredLevel;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok && data.user) {
          setState({ user: data.user, loading: false });
          // Share auth state via localStorage for other islands
          try {
            localStorage.setItem('cyclone-auth', JSON.stringify(data.user));
          } catch {}
          // Dispatch custom event for same-page islands
          window.dispatchEvent(new CustomEvent('cyclone:auth', { detail: data.user }));
        } else {
          setState({ user: null, loading: false });
          try {
            localStorage.removeItem('cyclone-auth');
          } catch {}
          window.dispatchEvent(new CustomEvent('cyclone:auth', { detail: null }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ user: null, loading: false });
        }
      });

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(() => {
    window.location.href = '/api/auth/login';
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    try {
      localStorage.removeItem('cyclone-auth');
    } catch {}
    window.location.reload();
  }, []);

  const isRole = useCallback((role: GroupRole) => hasRole(state.user, role), [state.user]);

  return {
    user: state.user,
    loading: state.loading,
    login,
    logout,
    isRole,
  };
}
