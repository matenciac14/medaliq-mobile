import { apiFetch } from './client'

export type TodaySession = {
  id: string
  type: string
  durationMin: number
  zoneTarget: string
  detailText: string
  completed: boolean
}

export type DashboardData = {
  firstName: string
  todaySession: TodaySession | null
  planData: {
    name: string
    currentWeek: number
    totalWeeks: number
    phase: string
  } | null
  metrics: {
    weightKg: number | null
    hrResting: number | null
    sleepHours: number | null
  }
  completedCount: number
  totalTraining: number
  checkinPending: boolean
  trialDaysLeft: number | null
}

export async function getDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/api/mobile/dashboard')
}
