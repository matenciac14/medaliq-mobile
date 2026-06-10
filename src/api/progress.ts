import { apiFetch } from './client'

export type ProgressData = {
  weightPoints: { week: number; kg: number }[]
  hrPoints: { week: number; bpm: number }[]
  weeks: { weekNumber: number; phase: string; adherencePct: number }[]
  weightGoal: number | null
  gymSessionsCompleted: number
  totalCheckIns: number
  overallAdherencePct: number
}

export async function getProgress(): Promise<ProgressData> {
  return apiFetch<ProgressData>('/api/mobile/progress')
}
