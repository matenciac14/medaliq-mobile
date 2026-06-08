import { create } from 'zustand'
import type { SessionUser } from '../api/auth'

type AuthState = {
  user: SessionUser | null
  isLoading: boolean
  setUser: (user: SessionUser | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}))
