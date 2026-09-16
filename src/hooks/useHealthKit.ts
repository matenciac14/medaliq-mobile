import { useState, useCallback } from 'react'
import { Platform } from 'react-native'

let AppleHealthKit: any = null
try {
  AppleHealthKit = require('react-native-health').default
} catch {
  // Module not available in Expo Go — hook degrades gracefully.
}

export interface HealthKitState {
  authorized: boolean
  loading: boolean
  error: string | null
}

const PERMISSIONS = AppleHealthKit
  ? {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.Workout,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.RestingHeartRate,
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.VO2Max,
        ],
        write: [],
      },
    }
  : { permissions: { read: [], write: [] } }

export function useHealthKit(): HealthKitState & { requestAuthorization: () => Promise<void> } {
  const [state, setState] = useState<HealthKitState>({
    authorized: false,
    loading:    false,
    error:      null,
  })

  const requestAuthorization = useCallback(async () => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) return

    setState((s) => ({ ...s, loading: true, error: null }))

    await new Promise<void>((resolve) => {
      AppleHealthKit.initHealthKit(PERMISSIONS, (err) => {
        if (err) {
          // HealthKit no informa cuáles permisos fueron denegados — tratar como parcial
          console.warn('[HealthKit] init error (may be partial permissions):', err)
          setState({ authorized: false, loading: false, error: String(err) })
        } else {
          setState({ authorized: true, loading: false, error: null })
        }
        resolve()
      })
    })
  }, [])

  return { ...state, requestAuthorization }
}
