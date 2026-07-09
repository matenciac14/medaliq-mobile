import { apiFetch } from './client'

export type HealthProfile = {
  age: number | null
  dateOfBirth: string | null
  weightKg: number | null
  weightGoalKg: number | null
  heightCm: number | null
  hrResting: number | null
  hrMax: number | null
  sleepHoursAvg: number | null
  gender: string | null
  sport: string | null
  experienceLevel: string | null
  injuries: string[]
  conditions: string[]
}

export type ProfilePatchPayload = {
  dateOfBirth?: string
  weightKg?: number
  weightGoalKg?: number
  heightCm?: number
  hrResting?: number
  hrMax?: number
  sleepHoursAvg?: number
  gender?: 'male' | 'female'
  sport?: string
  experienceLevel?: string
  injuries?: string[]
  conditions?: string[]
}

export async function getHealthProfile(): Promise<{ profile: HealthProfile | null }> {
  return apiFetch('/api/mobile/profile')
}

export async function patchHealthProfile(payload: ProfilePatchPayload): Promise<{ profile: HealthProfile }> {
  return apiFetch('/api/mobile/profile', { method: 'PATCH', body: payload })
}
