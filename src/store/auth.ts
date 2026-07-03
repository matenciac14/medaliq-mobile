import { create } from 'zustand'
import type { SessionUser } from '../api/auth'
import { refreshToken } from '../api/auth'

type AuthState = {
  user: SessionUser | null
  isLoading: boolean
  setUser: (user: SessionUser | null) => void
  setLoading: (loading: boolean) => void
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  refreshUser: async () => {
    const current = get().user
    if (!current) return
    try {
      const features = await refreshToken()
      set({ user: { ...current, features } })
    } catch {
      // silencioso — el usuario sigue con features anteriores
    }
  },
}))
