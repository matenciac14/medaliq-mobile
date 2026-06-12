import { apiFetch } from './client'

export type SessionLog = {
  id: string
  durationMin: number | null
  rpe: number | null
  hrAvg: number | null
  notes: string | null
}

export type PlannedSession = {
  id: string
  type: string
  durationMin: number
  zoneTarget: string
  dayOfWeek: number
  coachNote: string | null
  sportLabel: string | null
  detailText: string | null
  intensity: string | null
  completed: boolean
  log: SessionLog | null
}

export type PlanWeek = {
  id: string
  weekNumber: number
  phase: string
  sessions: PlannedSession[]
}

export type PlanData = {
  id: string
  name: string
  currentWeek: number
  totalWeeks: number
  weeks: PlanWeek[]
}

export async function getPlan(): Promise<PlanData | null> {
  return apiFetch<PlanData | null>('/api/mobile/plan')
}
