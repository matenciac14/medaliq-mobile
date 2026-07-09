import { apiFetch } from './client'

export type Benchmark = {
  id: string
  sport: string
  metric: string
  value: number
  unit: string
  testedAt: string
  notes?: string | null
}

export type GymPR = {
  id: string
  exerciseName: string
  weightKg: number | null
  repsCompleted: number | null
  date: string
}

export type LastRunSession = {
  id: string
  completedAt: string | null
  durationMin: number | null
  distanceKm: number | null
  rpe: number | null
  notes: string | null
}

export type ProgressData = {
  weightPoints: { week: number; kg: number }[]
  hrPoints: { week: number; bpm: number }[]
  wellbeingPoints: {
    week: number
    energyLevel: number | null
    stressLevel: number | null
    motivationLevel: number | null
    sleepHours: number | null
  }[]
  measurementPoints: {
    week: number
    waistCm: number | null
    armsCm: number | null
    hipsCm: number | null
    thighsCm: number | null
  }[]
  weeks: { weekNumber: number; phase: string; adherencePct: number }[]
  weightGoal: number | null
  gymSessionsCompleted: number
  gymAdherenceByWeek: { weekLabel: string; sessions: number }[]
  benchmarks: Benchmark[]
  gymPRs: GymPR[]
  totalCheckIns: number
  overallAdherencePct: number
}

export async function getProgress(): Promise<ProgressData> {
  return apiFetch<ProgressData>('/api/mobile/progress')
}

export async function getLastRunSession(type: string): Promise<{ log: LastRunSession | null }> {
  return apiFetch<{ log: LastRunSession | null }>(`/api/mobile/log/last-session?type=${encodeURIComponent(type)}`)
}
