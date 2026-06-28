import { apiFetch } from './client'

export type TodaySession = {
  id: string
  type: string
  durationMin: number
  zoneTarget: string
  detailText: string
  completed: boolean
}

export type WeekSession = {
  dayIndex: number   // 0=Mon … 6=Sun
  type: string | null
  done: boolean
  isToday: boolean
  id: string | null
  durationMin: number | null
  zoneTarget: string | null
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
    weightGoalKg: number | null
    hrResting: number | null
    sleepHours: number | null
  }
  weekSessions: WeekSession[]
  completedCount: number
  totalTraining: number
  checkinPending: boolean
  trialDaysLeft: number | null
  // hero cards
  streakDays: number
  raceDays: number | null
  isRecomp: boolean
  formStatus: 'good' | 'moderate' | 'rest'
  formMessage: string
  lastCheckIn: {
    energyLevel: number | null
    hardestSessionRpe: number | null
    sleepHours: number | null
  } | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null
  currentVolume: number | null
  volumeDeltaPct: number | null
  nutritionTarget: {
    kcal: number
    proteinG: number
    carbsG: number
    fatG: number
    label: string
  } | null
  mode: 'TRAINING' | 'RECOVERY' | 'FREE'
  recoveryDaysLeft: number | null
  completedPlanName: string | null
  recentActivity: {
    type: string
    completedAt: string
    durationMin: number | null
    rpe: number | null
  }[]
}

export async function getDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/api/mobile/dashboard')
}

export type WeekSessionsData = {
  weekSessions: WeekSession[]
  completedCount: number
  totalTraining: number
  weekLabel: string | null
  weekOffset: number
  isCurrentWeek: boolean
}

export async function getWeekSessions(weekOffset: number): Promise<WeekSessionsData> {
  return apiFetch<WeekSessionsData>(`/api/mobile/dashboard/week-sessions?weekOffset=${weekOffset}`)
}
