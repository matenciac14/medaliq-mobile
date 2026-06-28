import { apiFetch } from './client'

export type CoachAthlete = {
  id: string
  name: string | null
  email: string
  unread: number
}

export function getCoachAthletes(): Promise<{ athletes: CoachAthlete[] }> {
  return apiFetch('/api/mobile/coach/athletes')
}
