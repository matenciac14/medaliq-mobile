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

export async function submitCheckin(payload: CheckinPayload) {
  return apiFetch('/api/mobile/checkin', { method: 'POST', body: payload })
}
