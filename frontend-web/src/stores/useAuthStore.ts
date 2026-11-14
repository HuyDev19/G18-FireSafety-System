import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile } from '../types/pccc.types';

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isMfaAuthenticated: boolean;
  setAuth: (token: string, user: UserProfile, refreshToken?: string) => void;
  setMfaAuthenticated: (status: boolean) => void;
  updateUser: (fields: Partial<UserProfile>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isMfaAuthenticated: false,

      setAuth: (token, user, refreshToken) =>
        set({
          token,
          user,
          refreshToken: refreshToken || null,
          isMfaAuthenticated: !user.isTwoFactorEnabled,
        }),

      setMfaAuthenticated: (status) => set({ isMfaAuthenticated: status }),

      updateUser: (fields) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...fields } });
        }
      },

      logout: () =>
        set({
          token: null,
          refreshToken: null,
          user: null,
          isMfaAuthenticated: false,
        }),
    }),
    {
      name: 'pccc-auth-storage',
    }
  )
);
