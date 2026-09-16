import { apiFetch } from './client'

export type CheckinPayload = {
  weightKg?: number
  hrResting?: number
  sleepHours?: number
  energyLevel: number           // 1-10
  muscleSoreness: number        // 1-10 (RPE)
  stressLevel?: number          // 1-10
  painLevel?: number            // 0-10 (0=sin dolor, 3=leve, 7=moderada)
  motivationLevel?: number      // 1-10
  nutritionAdherencePct?: number // 0-100
  notes?: string
  waistCm?: number
  armsCm?: number
  hipsCm?: number
  thighsCm?: number
}

export type WeekSessionAdherence = {
  dayOfWeek: number
  completed: boolean
}

export type CheckinStatus = {
  submitted: boolean
  weekNumber: number
  totalWeeks: number | null
  weekSessions: WeekSessionAdherence[]
  hasAutoData: boolean
  data: {
    id: string
    weightKg: number | null
    hrResting: number | null
    sleepHours: number | null
    energyLevel: number | null
    stressLevel: number | null
    motivationLevel: number | null
    hardestSessionRpe: number | null
    painLevel: number | null
    notes: string | null
    recordedAt: string
  } | null
  pendingSuggestions?: CheckinSuggestion[]
}

export async function getCheckinStatus(): Promise<CheckinStatus> {
  return apiFetch('/api/mobile/checkin')
}

export type CheckinSuggestion = {
  id: string
  type: string
  title: string
  description: string
}

export type CheckinResult = {
  ok: boolean
  adjustment: {
    severity: 'ok' | 'warning' | 'critical'
    recommendation: string
    adjustments: string[]
    triggers: string[]
    planChanges?: { volumeDeltaPct?: number }
    nutritionChanges?: { newKcalHard?: number; newKcalEasy?: number }
  } | null
  suggestions?: CheckinSuggestion[]
  pendingSuggestions?: number
}

export async function acceptSuggestion(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/mobile/checkin/suggestions/${id}/accept`, { method: 'POST' })
}

export async function rejectSuggestion(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/mobile/checkin/suggestions/${id}/reject`, { method: 'POST' })
}

export async function submitCheckin(payload: CheckinPayload): Promise<CheckinResult> {
  return apiFetch('/api/mobile/checkin', { method: 'POST', body: payload })
}
