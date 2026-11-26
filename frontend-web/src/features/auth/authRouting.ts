import { useSyncExternalStore } from 'react';
import { useAuthStore, type AuthState } from '../../stores/useAuthStore';
import type { RoleCode } from '../../types/pccc.types';

// Only the route permissions confirmed by the Leader are defined here.
export const AUTH_ROUTE_ROLES = {
  internal: ['ADMIN', 'LEADER', 'INSPECTOR'],
  userManagement: ['ADMIN', 'LEADER'],
  facilities: ['ADMIN', 'LEADER', 'INSPECTOR', 'OWNER'],
} as const satisfies Record<string, readonly RoleCode[]>;

export type LoginPortal = 'officer' | 'business';

export function getLoginPortal(pathname: string): LoginPortal {
  return pathname === '/doanh-nghiep/login' ? 'business' : 'officer';
}

export function isRoleCode(value: unknown): value is RoleCode {
  return typeof value === 'string'
    && AUTH_ROUTE_ROLES.facilities.some((role) => role === value);
}

export function getRoleLandingPage(role: RoleCode): string {
  return role === 'OWNER' ? '/facilities' : '/dashboard';
}

export function getLoginPath(portal?: 'internal' | 'owner'): string {
  if (portal === 'internal') return '/admin-portal/login';
  if (portal === 'owner') return '/doanh-nghiep/login';
  return '/login';
}

/** A local UI check only; Backend still validates tokens and data permissions. */
export function hasAuthenticatedSession(
  state: Pick<AuthState, 'token' | 'user' | 'isMfaAuthenticated'>,
): boolean {
  return typeof state.token === 'string' && state.token.trim().length > 0
    && !!state.user && isRoleCode(state.user.role)
    && typeof state.user.id === 'string' && state.user.id.trim().length > 0
    && state.isMfaAuthenticated === true;
}

function subscribeHydration(onChange: () => void): () => void {
  const stopStart = useAuthStore.persist.onHydrate(onChange);
  const stopFinish = useAuthStore.persist.onFinishHydration(onChange);
  return () => { stopStart(); stopFinish(); };
}

export function useAuthHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, useAuthStore.persist.hasHydrated, () => false);
}
