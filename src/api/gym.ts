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

export type RunningSession = {
  type: string
  durationMin: number | null
  zoneTarget: string | null
  intensity: string
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
  runningSession: RunningSession | null
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
  assignedWorkoutId: string | null
  plannedSessionId: string | null
  templateName: string
  dayOfWeek: number
  isRestDay: boolean
  hasCoach: boolean
  workoutDay: {
    id: string
    label: string
    muscleGroups: string[]
    warmupNotes: string | null
    cardioNotes: string | null
  } | null
  exercises: {
    id: string
    order: number
    sets: number
    repsScheme: string
    restSeconds: number | null
    notes: string | null
    setType: string
    supersetWith: string | null
    exercise: {
      id: string
      name: string
      bodyPart: string
      target: string
      equipment: string
      mechanic: string | null
      description: string | null
      gif: string | null
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
  setLogType?: 'WORK' | 'WARMUP' | 'DROPSET'
}

export type ExerciseOverride = {
  originalWorkoutExerciseId: string
  replacedWithExerciseId: string
  replacedExerciseName: string
  reason?: string
}

export type CompleteSessionPayload = {
  assignedWorkoutId?: string
  plannedSessionId?: string
  dayOfWeek: number
  sets: SetLog[]
  rpe?: number
  durationMin?: number
  notes?: string
  exerciseOverrides?: ExerciseOverride[]
}

export type ExerciseSearchResult = {
  id: string
  name: string
  nameEs?: string
  bodyPart: string
  target: string
  equipment: string
}

export async function searchExercises(params: {
  q?: string
  bodyPart?: string
  limit?: number
}): Promise<ExerciseSearchResult[]> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.bodyPart) sp.set('bodyPart', params.bodyPart)
  sp.set('limit', String(params.limit ?? 20))
  const res = await apiFetch<{ exercises: ExerciseSearchResult[]; total: number }>(
    `/api/mobile/exercises?${sp}`
  )
  return res.exercises
}

export async function getTodayGymSession(): Promise<GymSessionData | null> {
  return apiFetch<GymSessionData | null>('/api/gym/session/today')
}

export type PRResult = {
  exerciseName: string | null
  weightKg: number | null
}

export async function completeGymSession(payload: CompleteSessionPayload): Promise<{ sessionId: string; newPRs: PRResult[] }> {
  return apiFetch<{ sessionId: string; newPRs: PRResult[] }>('/api/gym/session/complete', { method: 'POST', body: payload })
}
