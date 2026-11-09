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

export type GymPRHistoryPoint = { date: string; oneRmKg: number }
export type GymPRHistorySeries = { exerciseName: string; points: GymPRHistoryPoint[] }

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

export type ActivityGridEntry = { sessionCount: number; types: string[] }

export type MuscleVolumeEntry = {
  volume: number
  sets: number
  lastTrainedAt: string
  fatigueLevel: 0 | 1 | 2 | 3
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
  nutritionAdherence: { date: string; kcalLogged: number; targetKcal: number; pct: number }[]
  benchmarks: Benchmark[]
  gymPRs: GymPR[]
  gymPRHistory: GymPRHistorySeries[]
  activityGrid: Record<string, ActivityGridEntry>
  totalCheckIns: number
  overallAdherencePct: number
}

export async function getMuscleVolume(days = 7): Promise<Record<string, MuscleVolumeEntry>> {
  const res = await apiFetch<{ muscles: Record<string, MuscleVolumeEntry> }>(`/api/mobile/progress/muscles?days=${days}`)
  return res.muscles
}

export async function getProgress(): Promise<ProgressData> {
  return apiFetch<ProgressData>('/api/mobile/progress')
}

export async function getLastRunSession(type: string): Promise<{ log: LastRunSession | null }> {
  return apiFetch<{ log: LastRunSession | null }>(`/api/mobile/log/last-session?type=${encodeURIComponent(type)}`)
}

export type RunningPr = {
  distance: string
  bestPaceFormatted: string | null
  bestTimeFormatted: string | null
  achievedAt: string | null
  source: string | null
}

export async function getRunningPrs(): Promise<RunningPr[]> {
  const res = await apiFetch<{ prs: RunningPr[] }>('/api/mobile/running/prs')
  return res.prs
}

export type WeeklyRecapData = {
  weekStart: string
  weekEnd: string
  sessionsCompleted: number
  totalDurationMin: number
  totalVolume: number | null
  newPRs: { exerciseName: string; type: string; value: number; unit: string }[]
  avgKcal: number | null
  daysLogged: number
  avgProteinG: number | null
  weightStart: number | null
  weightEnd: number | null
  weightChange: number | null
  comparison: {
    sessionsChange: number
    avgKcalChange: number | null
    volumeChange: number | null
  } | null
  currentStreak: number
}

export async function getWeeklyRecap(week: 'current' | 'previous' = 'previous'): Promise<WeeklyRecapData> {
  return apiFetch<WeeklyRecapData>(`/api/mobile/recap/weekly?week=${week}`)
}
