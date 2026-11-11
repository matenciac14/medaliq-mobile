// TODO: pnpm add react-native-health-connect
// TODO: Add to app.json plugins: ["react-native-health-connect", { "requestPermissionsOnLaunch": false }]
// TODO: Add android.permissions: ["android.permission.health.READ_EXERCISE", "android.permission.health.READ_HEART_RATE", "android.permission.health.READ_SLEEP"]

import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiFetch } from '../api/client'

// Conditional import — won't crash if package isn't installed
let HealthConnect: any = null
try {
  HealthConnect = require('react-native-health-connect')
} catch {
  // Module not available — all exports degrade gracefully via Platform/guard checks.
}

const LAST_SYNC_KEY = 'hc_last_sync_at'
const HC_ENABLED_KEY = 'healthconnect_sync_enabled'
const INITIAL_SYNC_DAYS = 7

type WearableDiscipline = 'RUNNING' | 'STRENGTH' | 'CYCLING' | 'SWIMMING' | 'OTHER'

// Health Connect exercise type → discipline
const EXERCISE_TYPE_MAP: Record<number, WearableDiscipline> = {
  56: 'RUNNING',    // EXERCISE_TYPE_RUNNING
  57: 'RUNNING',    // EXERCISE_TYPE_RUNNING_TREADMILL
  8:  'CYCLING',    // EXERCISE_TYPE_BIKING
  9:  'CYCLING',    // EXERCISE_TYPE_BIKING_STATIONARY
  74: 'SWIMMING',   // EXERCISE_TYPE_SWIMMING_OPEN_WATER
  75: 'SWIMMING',   // EXERCISE_TYPE_SWIMMING_POOL
  80: 'STRENGTH',   // EXERCISE_TYPE_WEIGHTLIFTING
  // react-native-health-connect may use string keys too — extend as needed
}

function mapExerciseType(type: number | string): WearableDiscipline {
  if (typeof type === 'number') return EXERCISE_TYPE_MAP[type] ?? 'OTHER'
  // String fallback for newer API versions
  const upper = String(type).toUpperCase()
  if (upper.includes('RUNNING')) return 'RUNNING'
  if (upper.includes('CYCLING') || upper.includes('BIKING')) return 'CYCLING'
  if (upper.includes('SWIMMING')) return 'SWIMMING'
  if (upper.includes('STRENGTH') || upper.includes('WEIGHTLIFTING')) return 'STRENGTH'
  return 'OTHER'
}

// ── Public API (mirrors healthkit.service.ts) ────────────────────────────────

export async function isSyncEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const val = await AsyncStorage.getItem(HC_ENABLED_KEY)
  return val === 'true'
}

export async function setSyncEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(HC_ENABLED_KEY, enabled ? 'true' : 'false')
}

/** Check if Health Connect SDK is available on this device */
export async function isAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android' || !HealthConnect) return false
  try {
    const result = await HealthConnect.getSdkStatus()
    // SDK_AVAILABLE = 3 in the Health Connect SDK
    return result === 3 || result === 'SDK_AVAILABLE'
  } catch {
    return false
  }
}

/** Request read permissions for exercise, heart rate, and sleep */
export async function requestPermissions(): Promise<boolean> {
  if (!HealthConnect) return false
  try {
    await HealthConnect.initialize()
    const granted = await HealthConnect.requestPermission([
      { accessType: 'read', recordType: 'ExerciseSession' },
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'RestingHeartRate' },
      { accessType: 'read', recordType: 'SleepSession' },
    ])
    return Array.isArray(granted) && granted.length > 0
  } catch (err) {
    console.error('[HealthConnect] requestPermissions error:', err)
    return false
  }
}

/** Sync recent workouts from Health Connect → Medaliq API */
export async function syncRecent(): Promise<void> {
  if (Platform.OS !== 'android') return
  if (!(await isSyncEnabled())) return
  if (!HealthConnect) return

  try {
    await HealthConnect.initialize()
  } catch {
    return
  }

  const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY)
  const startDate = lastSyncStr
    ? new Date(lastSyncStr)
    : new Date(Date.now() - INITIAL_SYNC_DAYS * 24 * 60 * 60 * 1000)

  const sessions = await queryExerciseSessions(startDate)
  if (sessions.length === 0) return

  for (const session of sessions) {
    await importSession(session)
  }

  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
}

async function queryExerciseSessions(startDate: Date): Promise<any[]> {
  if (!HealthConnect) return []
  try {
    const result = await HealthConnect.readRecords('ExerciseSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startDate.toISOString(),
        endTime: new Date().toISOString(),
      },
    })
    return result?.records ?? result ?? []
  } catch (err) {
    console.error('[HealthConnect] queryExerciseSessions error:', err)
    return []
  }
}

async function importSession(session: any): Promise<void> {
  try {
    const externalId = session.metadata?.id ?? session.metadata?.clientRecordId
    if (!externalId) return

    const exerciseType = session.exerciseType ?? 0
    const discipline = mapExerciseType(exerciseType)

    const startTime = new Date(session.startTime)
    const endTime = new Date(session.endTime)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMin = durationMs > 0 ? Math.round(durationMs / 60000) : undefined

    // Distance and calories may be in session segments or as separate records
    const distanceMeters = session.distance?.inMeters ?? session.distance ?? 0
    const calories = session.energy?.inKilocalories ?? session.energy ?? undefined
    const sourceName = session.metadata?.dataOrigin?.packageName ?? 'Health Connect'

    await apiFetch('/api/mobile/log/session', {
      method: 'POST',
      body: {
        sessionType:       discipline,
        completed:         true,
        actualDurationMin: durationMin,
        distanceKm:        distanceMeters > 0 ? distanceMeters / 1000 : undefined,
        sessionDate:       startTime.toISOString().split('T')[0],
        notes:             `Health Connect — ${sourceName}`,
        dataSource:        'HEALTH_CONNECT',
        externalId,
        caloriesBurned:    calories ? Math.round(calories) : undefined,
      },
    })
  } catch (err) {
    console.error('[HealthConnect] importSession error:', err)
  }
}

/** Returns the latest resting heart rate from the last 7 days */
export async function queryRestingHeartRate(): Promise<number | null> {
  if (Platform.OS !== 'android' || !HealthConnect) return null
  try {
    await HealthConnect.initialize()
    const result = await HealthConnect.readRecords('RestingHeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
      },
    })
    const records = result?.records ?? result ?? []
    if (records.length === 0) return null
    // Most recent last
    const latest = records[records.length - 1]
    return Math.round(latest.beatsPerMinute ?? latest.bpm ?? 0) || null
  } catch (err) {
    console.error('[HealthConnect] queryRestingHeartRate error:', err)
    return null
  }
}

/** Returns sleep hours from last night (yesterday 18:00 → now) */
export async function querySleepHours(): Promise<number | null> {
  if (Platform.OS !== 'android' || !HealthConnect) return null
  try {
    await HealthConnect.initialize()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(18, 0, 0, 0)

    const result = await HealthConnect.readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: yesterday.toISOString(),
        endTime: new Date().toISOString(),
      },
    })
    const records = result?.records ?? result ?? []
    if (records.length === 0) return null

    let totalMs = 0
    for (const session of records) {
      const stages = session.stages ?? []
      if (stages.length > 0) {
        // Sum actual sleep stages (exclude AWAKE = 1)
        for (const stage of stages) {
          if (stage.stage !== 1 && stage.stage !== 'AWAKE') {
            totalMs += new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime()
          }
        }
      } else {
        // No stage data — use full session duration
        totalMs += new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
      }
    }

    const hours = totalMs / (1000 * 60 * 60)
    return hours > 0 ? Math.round(hours * 10) / 10 : null
  } catch (err) {
    console.error('[HealthConnect] querySleepHours error:', err)
    return null
  }
}

/** Sync daily health data (sleep + resting HR) to API */
export async function syncDailyHealth(): Promise<void> {
  if (Platform.OS !== 'android') return
  if (!(await isSyncEnabled())) return

  const [sleepHours, restingHR] = await Promise.all([
    querySleepHours(),
    queryRestingHeartRate(),
  ])

  if (sleepHours == null && restingHR == null) return

  try {
    await apiFetch('/api/mobile/health/sync-daily', {
      method: 'POST',
      body: {
        sleepHours,
        restingHR,
        source: 'HEALTH_CONNECT',
      },
    })
  } catch (err) {
    console.error('[HealthConnect] syncDailyHealth error:', err)
  }
}
