import { apiFetch } from './client'

export type MobileExercise = {
  id: string
  name: string
  nameEs?: string
  bodyPart: string
  target: string
  equipment: string
  difficulty?: string
  gif?: string
}

export type ExerciseDetail = MobileExercise & {
  mechanic?: string
  force?: string
  secondaryMuscles: string[]
  instructions: string[]
  instructionsEs: string[]
  description?: string
}

export type ExercisesResponse = {
  exercises: MobileExercise[]
  total: number
  page: number
  pages: number
}

export async function getExercises(params: {
  q?: string
  bodyPart?: string
  page?: number
  limit?: number
}): Promise<ExercisesResponse> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.bodyPart) sp.set('bodyPart', params.bodyPart)
  sp.set('page', String(params.page ?? 1))
  sp.set('limit', String(params.limit ?? 20))
  return apiFetch<ExercisesResponse>(`/api/mobile/exercises?${sp}`)
}

export async function getExerciseDetail(id: string): Promise<ExerciseDetail> {
  const res = await apiFetch<{ exercise: ExerciseDetail }>(`/api/mobile/exercises/${id}`)
  return res.exercise
}
