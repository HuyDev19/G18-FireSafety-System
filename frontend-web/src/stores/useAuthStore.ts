import { create } from 'zustand';
import { UserProfile } from '../types/pccc.types';

export interface AuthState {
  token: string | null;
  user: UserProfile | null;
  setAuth: (token: string, user: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: (token: string, user: UserProfile) => set({ token, user }),
  logout: () => set({ token: null, user: null }),
}));
