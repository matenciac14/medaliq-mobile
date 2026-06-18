import { apiFetch } from './client'

export type PublicTemplate = {
  id: string
  name: string
  description: string | null
  goal: string | null
  level: string | null
  daysPerWeek: number
  category: string | null
  trainingDays: number
}

export async function getPublicTemplates(): Promise<PublicTemplate[]> {
  return apiFetch<PublicTemplate[]>('/api/mobile/gym/templates')
}

export async function assignTemplate(templateId: string) {
  return apiFetch('/api/gym/assign', { method: 'POST', body: { templateId } })
}

export type GymDayDetail = {
  dow: number
  dateNum: number
  isToday: boolean
  isCompleted: boolean
  isRest: boolean
  hasSession: boolean
  label: string | null
  muscleGroup: string | null
}

export type GymWeekDetail =
  | { type: 'rest' }
  | { type: 'none' }
  | { type: 'planned'; planned: { label: string; exercises: { name: string; sets: number; repsScheme: string }[] } }
  | { type: 'completed'; session: { durationMin: number | null; rpe: number | null; notes: string | null; exercises: { name: string; sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null; completed: boolean }[] }[] } }

export type GymWeekData = {
  templateName: string
  coachName: string | null
  weekOffset: number
  isCurrentWeek: boolean
  mondayDate: string
  completedCount: number
  trainingDays: number
  days: GymDayDetail[]
  selectedDetail: GymWeekDetail | null
}

export async function getGymWeek(weekOffset: number, selectedDow?: number): Promise<GymWeekData> {
  const params = new URLSearchParams({ weekOffset: String(weekOffset) })
  if (selectedDow) params.set('selectedDow', String(selectedDow))
  return apiFetch<GymWeekData>(`/api/mobile/gym/week?${params}`)
}

export type GymSessionData = {
  assignedWorkoutId: string
  templateName: string
  workoutDay: {
    id: string
    label: string
    muscleGroups: string[]
  } | null
  exercises: {
    id: string
    order: number
    sets: number
    repsScheme: string
    restSeconds: number | null
    setType: string
    supersetWith: string | null
    exercise: {
      id: string
      name: string
      muscleGroups: string[]
      equipment: string
      tips: string | null
    }
    previousLogs: {
      setNumber: number
      weightKg: number | null
      repsCompleted: number | null
    }[]
  }[]
}

export type SetLog = {
  workoutExerciseId: string
  setNumber: number
  weightKg: number | null
  repsCompleted: number | null
  completed: boolean
}

export type CompleteSessionPayload = {
  assignedWorkoutId: string
  dayOfWeek: number
  setLogs: SetLog[]
  rpe?: number
  durationMin?: number
  notes?: string
}

export async function getTodayGymSession(): Promise<GymSessionData | null> {
  return apiFetch<GymSessionData | null>('/api/gym/session/today')
}

export async function completeGymSession(payload: CompleteSessionPayload) {
  return apiFetch('/api/gym/session/complete', { method: 'POST', body: payload })
}
