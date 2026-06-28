import { apiFetch } from './client'

export type CheckinPayload = {
  weightKg?: number
  hrResting?: number
  sleepHours?: number
  energyLevel: number
  muscleSoreness: number
  stressLevel: number
  painLevel?: number      // 1-10 (hasPain deriva server-side: painLevel >= 5)
  motivationLevel?: number // 1-10
  notes?: string
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
}

export async function getCheckinStatus(): Promise<CheckinStatus> {
  return apiFetch('/api/mobile/checkin')
}

export async function submitCheckin(payload: CheckinPayload) {
  return apiFetch('/api/mobile/checkin', { method: 'POST', body: payload })
}
