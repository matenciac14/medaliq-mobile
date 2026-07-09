import { apiFetch } from './client'

export type CheckinPayload = {
  weightKg?: number
  hrResting?: number
  sleepHours?: number
  energyLevel: number
  muscleSoreness: number
  stressLevel: number
  painLevel?: number       // 1-10 (hasPain deriva server-side: painLevel >= 5)
  motivationLevel?: number // 1-10
  notes?: string
  // Medidas corporales (observacionales — no disparan ajustes de plan)
  waistCm?: number
  armsCm?: number
  hipsCm?: number
  thighsCm?: number
}

export type CheckinStatus = {
  submitted: boolean
  weekNumber: number
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
