import { create } from 'zustand'
import type { PRResult } from '../api/gym'

export type LastSessionSummary = {
  durationMin: number
  prCount: number
  prs: PRResult[]
}

type GymSessionStore = {
  lastSession: LastSessionSummary | null
  setLastSession: (s: LastSessionSummary) => void
  clearLastSession: () => void
}

export const useGymSessionStore = create<GymSessionStore>((set) => ({
  lastSession: null,
  setLastSession: (lastSession) => set({ lastSession }),
  clearLastSession: () => set({ lastSession: null }),
}))
