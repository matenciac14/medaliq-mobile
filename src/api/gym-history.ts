import { apiFetch } from './client'

export type GymSessionSummary = {
  id: string
  date: string
  dayOfWeek: number
  label: string
  muscleGroups: string[]
  durationMin: number | null
  rpe: number | null
  completed: boolean
  notes: string | null
  completedSets: number
  volumeKg: number
  exercises: {
    name: string
    sets: {
      setNumber: number
      weightKg: number | null
      repsCompleted: number | null
      completed: boolean
    }[]
  }[]
}

export type GymHistoryData = {
  sessions: GymSessionSummary[]
  stats: {
    total: number
    completed: number
    totalSets: number
    totalVolumeKg: number
  }
}

export async function getGymHistory(): Promise<GymHistoryData> {
  return apiFetch<GymHistoryData>('/api/mobile/gym/history')
}
