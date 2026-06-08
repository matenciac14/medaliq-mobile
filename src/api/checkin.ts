import { apiFetch } from './client'

export type CheckinPayload = {
  weightKg?: number
  sleepHours?: number
  energyLevel: number
  muscleSoreness: number
  stressLevel: number
  notes?: string
}

export type CheckinStatus = {
  pending: boolean
  lastCheckin: {
    createdAt: string
    energyLevel: number
    weightKg: number | null
  } | null
}

export async function submitCheckin(payload: CheckinPayload) {
  return apiFetch('/api/mobile/checkin', { method: 'POST', body: payload })
}

export async function getCheckinStatus(): Promise<CheckinStatus> {
  return apiFetch<CheckinStatus>('/api/mobile/checkin-status')
}
