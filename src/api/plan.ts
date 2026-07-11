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

export type LastCompletedPlan = {
  name: string
  totalWeeks: number
  endDate: string | null
  sessionsLogged: number
  sessionsTotal: number
}

export type PlanResponse = PlanData | { lastCompletedPlan: LastCompletedPlan } | null

export async function getPlan(): Promise<PlanResponse> {
  return apiFetch<PlanResponse>('/api/mobile/plan')
}
