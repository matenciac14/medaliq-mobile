import { apiFetch } from './client'

export type SessionLog = {
  id: string
  durationMin: number | null
  distanceKm: number | null
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
  structure: string | null
  intensity: string | null
  completed: boolean
  log: SessionLog | null
}

export type PlanWeek = {
  id: string
  weekNumber: number
  phase: string
  volumeKm: number
  focusDescription: string | null
  isRecoveryWeek: boolean
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

// ── Calendar (tracking mode — unified week with gym/freeRun/sport) ────

export type CalendarDay = {
  date: string
  dow: number
  weekIdx: number
  dateNum: number
  sport: {
    sessionId: string; type: string; intensity: string; durationMin: number
    zoneTarget: string | null; detailText: string | null; done: boolean
    logId: string | null; logDurationMin: number | null; logRpe: number | null
    logHrAvg: number | null; logNotes: string | null
  } | null
  gym: {
    workoutDayId: string | null; label: string; templateName: string | null
    gymSessionId: string | null; done: boolean; durationMin: number | null; rpe: number | null
  } | null
  freeRun: {
    sessionLogId: string; type: string; durationMin: number | null
    distanceKm: number | null; rpe: number | null
  } | null
}

export type CalendarWeek = {
  weekStart: string; weekEnd: string; label: string; weekOffset: number
  days: CalendarDay[]
}

export async function getCalendarWeek(weekOffset: number): Promise<CalendarWeek> {
  return apiFetch<CalendarWeek>(`/api/mobile/calendar?weekOffset=${weekOffset}`)
}
