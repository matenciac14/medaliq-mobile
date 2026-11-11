import { useState, useEffect, useCallback } from 'react'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// iOS
import { useHealthKit } from './useHealthKit'
import * as HealthKitService from '../services/healthkit.service'

// Android
import * as HealthConnectService from '../services/healthconnect.service'

const LAST_SYNC_KEY_IOS = 'hk_last_sync_at'
const LAST_SYNC_KEY_ANDROID = 'hc_last_sync_at'

export interface HealthSyncState {
  /** true if the platform supports health data sync (iOS or Android) */
  isAvailable: boolean
  /** true if sync is enabled in AsyncStorage */
  isEnabled: boolean
  /** true while toggling or syncing */
  loading: boolean
  /** last successful sync timestamp */
  lastSync: Date | null
  /** toggle sync on/off — handles permissions automatically */
  toggle: () => Promise<void>
  /** manually trigger a sync now */
  syncNow: () => Promise<void>
}

export function useHealthSync(): HealthSyncState {
  const isIOS = Platform.OS === 'ios'
  const isAndroid = Platform.OS === 'android'

  // iOS-specific hook (no-ops on Android)
  const { authorized: hkAuthorized, requestAuthorization: hkRequestAuth } = useHealthKit()

  const [isAvailable, setIsAvailable] = useState(isIOS) // iOS always available if module loads
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // Check availability and current state on mount
  useEffect(() => {
    async function init() {
      if (isAndroid) {
        const available = await HealthConnectService.isAvailable()
        setIsAvailable(available)
        if (available) {
          const enabled = await HealthConnectService.isSyncEnabled()
          setIsEnabled(enabled)
        }
      } else if (isIOS) {
        const enabled = await HealthKitService.isSyncEnabled()
        setIsEnabled(enabled)
      }

      // Load last sync timestamp
      const key = isIOS ? LAST_SYNC_KEY_IOS : LAST_SYNC_KEY_ANDROID
      const stored = await AsyncStorage.getItem(key)
      if (stored) setLastSync(new Date(stored))
    }
    init()
  }, [isIOS, isAndroid])

  const toggle = useCallback(async () => {
    setLoading(true)
    try {
      const newValue = !isEnabled

      if (isIOS) {
        if (newValue && !hkAuthorized) {
          await hkRequestAuth()
        }
        await HealthKitService.setSyncEnabled(newValue)
      } else if (isAndroid) {
        if (newValue) {
          const granted = await HealthConnectService.requestPermissions()
          if (!granted) {
            setLoading(false)
            return // User denied permissions — don't enable
          }
        }
        await HealthConnectService.setSyncEnabled(newValue)
      }

      setIsEnabled(newValue)
    } finally {
      setLoading(false)
    }
  }, [isEnabled, isIOS, isAndroid, hkAuthorized, hkRequestAuth])

  const syncNow = useCallback(async () => {
    if (!isEnabled) return
    setLoading(true)
    try {
      if (isIOS) {
        await HealthKitService.syncRecent()
      } else if (isAndroid) {
        await HealthConnectService.syncRecent()
        await HealthConnectService.syncDailyHealth()
      }

      const key = isIOS ? LAST_SYNC_KEY_IOS : LAST_SYNC_KEY_ANDROID
      const stored = await AsyncStorage.getItem(key)
      if (stored) setLastSync(new Date(stored))
    } finally {
      setLoading(false)
    }
  }, [isEnabled, isIOS, isAndroid])

  return {
    isAvailable,
    isEnabled,
    loading,
    lastSync,
    toggle,
    syncNow,
  }
}
