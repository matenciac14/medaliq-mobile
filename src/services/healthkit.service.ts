import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiFetch } from '../api/client'

// react-native-health requires a native module (dev client / EAS build).
// In Expo Go we provide a no-op stub so the app still runs.
let AppleHealthKit: any = null
try {
  AppleHealthKit = require('react-native-health').default
} catch {
  // Module not available (Expo Go) — all exports degrade gracefully via Platform/guard checks.
}

type HealthValue = any
type HealthInputOptions = any

const LAST_SYNC_KEY = 'hk_last_sync_at'
const HK_ENABLED_KEY = 'hk_sync_enabled'
const INITIAL_SYNC_DAYS = 7

type WearableDiscipline = 'RUNNING' | 'STRENGTH' | 'CYCLING' | 'SWIMMING' | 'OTHER'

// HKWorkoutActivityType numeric → discipline
const ACTIVITY_TYPE_MAP: Record<number, WearableDiscipline> = {
  37: 'RUNNING',    // HKWorkoutActivityTypeRunning
  13: 'CYCLING',    // HKWorkoutActivityTypeCycling
  46: 'SWIMMING',   // HKWorkoutActivityTypeSwimming
  20: 'STRENGTH',   // HKWorkoutActivityTypeTraditionalStrengthTraining
  83: 'STRENGTH',   // HKWorkoutActivityTypeFunctionalStrengthTraining
  14: 'STRENGTH',   // HKWorkoutActivityTypeCrossTraining
}

function mapActivityType(type: number): WearableDiscipline {
  return ACTIVITY_TYPE_MAP[type] ?? 'OTHER'
}

export async function isSyncEnabled(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  const val = await AsyncStorage.getItem(HK_ENABLED_KEY)
  return val === 'true'
}

export async function setSyncEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(HK_ENABLED_KEY, enabled ? 'true' : 'false')
}

/** Sincroniza workouts recientes de HealthKit → Medaliq API */
export async function syncRecent(): Promise<void> {
  if (Platform.OS !== 'ios') return
  if (!(await isSyncEnabled())) return

  const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY)
  const startDate = lastSyncStr
    ? new Date(lastSyncStr)
    : new Date(Date.now() - INITIAL_SYNC_DAYS * 24 * 60 * 60 * 1000)

  const workouts = await queryWorkouts(startDate)
  if (workouts.length === 0) return

  for (const workout of workouts) {
    await importWorkout(workout)
  }

  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
}

function queryWorkouts(startDate: Date): Promise<HealthValue[]> {
  if (!AppleHealthKit) return Promise.resolve([])
  return new Promise((resolve, reject) => {
    const options: HealthInputOptions = {
      startDate: startDate.toISOString(),
      endDate:   new Date().toISOString(),
    }
    AppleHealthKit.getSamples(
      { ...options, type: 'Workout' as any },
      (err: string, results: HealthValue[]) => {
        if (err) { reject(err); return }
        resolve(results ?? [])
      }
    )
  })
}

async function importWorkout(workout: any): Promise<void> {
  try {
    const externalId = workout.id ?? workout.uuid
    if (!externalId) return

    const discipline = mapActivityType(workout.activityType ?? 0)
    const distanceMeters = workout.distance ?? 0
    const durationSec = workout.duration ?? 0
    const sessionDate = new Date(workout.startDate ?? workout.start)

    await apiFetch('/api/mobile/log/session', {
      method: 'POST',
      body: {
        sessionType:       discipline,
        completed:         true,
        actualDurationMin: durationSec > 0 ? Math.round(durationSec / 60) : undefined,
        distanceKm:        distanceMeters > 0 ? distanceMeters / 1000 : undefined,
        hrAvg:             workout.averageHeartRate ? Math.round(workout.averageHeartRate) : undefined,
        hrMax:             workout.maxHeartRate ? Math.round(workout.maxHeartRate) : undefined,
        sessionDate:       sessionDate.toISOString().split('T')[0],
        notes:             workout.sourceName ? `Apple Health — ${workout.sourceName}` : 'Apple Health',
        dataSource:        'HEALTHKIT',
        externalId,
        caloriesBurned:    workout.totalEnergyBurned ? Math.round(workout.totalEnergyBurned) : undefined,
      },
    })
  } catch (err) {
    console.error('[HealthKit] importWorkout error:', err)
  }
}

/** Retorna el último valor de FC en reposo de los últimos 7 días */
export function queryRestingHeartRate(): Promise<number | null> {
  if (Platform.OS !== 'ios') return Promise.resolve(null)

  if (!AppleHealthKit) return Promise.resolve(null)
  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate:   new Date().toISOString(),
      ascending: false,
      limit:     1,
    }
    AppleHealthKit.getRestingHeartRateSamples(
      options,
      (err: string, results: HealthValue[]) => {
        if (err || !results?.length) { resolve(null); return }
        resolve(Math.round(results[0].value))
      }
    )
  })
}

/** Retorna horas de sueño de anoche */
export function querySleepHours(): Promise<number | null> {
  if (Platform.OS !== 'ios') return Promise.resolve(null)

  if (!AppleHealthKit) return Promise.resolve(null)
  return new Promise((resolve) => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(18, 0, 0, 0)

    const options: HealthInputOptions = {
      startDate: yesterday.toISOString(),
      endDate:   new Date().toISOString(),
    }
    AppleHealthKit.getSleepSamples(
      options,
      (err: string, results: HealthValue[]) => {
        if (err || !results?.length) { resolve(null); return }
        const totalMs = results.reduce((acc: number, s: any) => {
          if (s.value !== 'INBED') {
            return acc + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime())
          }
          return acc
        }, 0)
        const hours = totalMs / (1000 * 60 * 60)
        resolve(hours > 0 ? Math.round(hours * 10) / 10 : null)
      }
    )
  })
}
