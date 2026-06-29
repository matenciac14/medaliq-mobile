import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CompleteSessionPayload } from '@/api/gym'

const DRAFT_PREFIX = 'gym_draft:'
const PENDING_SYNC_KEY = 'gym_pending_sync'

export type GymDraftSet = {
  workoutExerciseId: string
  setNumber: number
  weightKg: string
  repsCompleted: string
  completed: boolean
}

export type GymDraft = {
  sets: GymDraftSet[]
  savedAt: number
}

export async function saveDraft(sessionKey: string, sets: GymDraftSet[]): Promise<void> {
  const draft: GymDraft = { sets, savedAt: Date.now() }
  await AsyncStorage.setItem(`${DRAFT_PREFIX}${sessionKey}`, JSON.stringify(draft))
}

export async function loadDraft(sessionKey: string): Promise<GymDraft | null> {
  const raw = await AsyncStorage.getItem(`${DRAFT_PREFIX}${sessionKey}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as GymDraft
  } catch {
    return null
  }
}

export async function clearDraft(sessionKey: string): Promise<void> {
  await AsyncStorage.removeItem(`${DRAFT_PREFIX}${sessionKey}`)
}

export type PendingSync = {
  sessionKey: string
  payload: CompleteSessionPayload
  savedAt: number
}

export async function savePendingSync(sessionKey: string, payload: CompleteSessionPayload): Promise<void> {
  const pending: PendingSync = { sessionKey, payload, savedAt: Date.now() }
  await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending))
}

export async function loadPendingSync(): Promise<PendingSync | null> {
  const raw = await AsyncStorage.getItem(PENDING_SYNC_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PendingSync
  } catch {
    return null
  }
}

export async function clearPendingSync(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_SYNC_KEY)
}
