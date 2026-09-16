import { useEffect, useCallback, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '../../src/store/auth'
import { getMe } from '../../src/api/auth'
import { registerForPushNotificationsAsync } from '../../src/lib/notifications'
import { registerPushToken } from '../../src/api/notifications'
import { syncRecent } from '../../src/services/healthkit.service'

// Mapa de screen → ruta Expo Router
const SCREEN_ROUTES: Record<string, string> = {
  notifications:  '/(app)/notifications',
  checkin:        '/(app)/(tabs)/checkin',
  plan:           '/(app)/(tabs)/plan',
  gym:            '/(app)/(tabs)/gym',
  progress:       '/(app)/(tabs)/progress',
  nutrition:      '/(app)/(tabs)/nutrition',
  messages:       '/(app)/messages',
}

export default function AppLayout() {
  const { user, isLoading, setUser } = useAuthStore()
  const router = useRouter()
  const pushRegisteredRef = useRef(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login')
    }
  }, [user, isLoading])

  // Register push token once per session after auth
  useEffect(() => {
    if (!user || pushRegisteredRef.current) return
    pushRegisteredRef.current = true
    registerForPushNotificationsAsync()
      .then(token => {
        if (token) return registerPushToken(token)
      })
      .catch(err => console.error('[push] Token registration failed:', err))
  }, [user])

  // Sync HealthKit workouts al autenticar — fire-and-forget, no bloquea UI
  useEffect(() => {
    if (!user) return
    syncRecent().catch(err => console.error('[healthkit] syncRecent failed:', err))
  }, [user?.id])

  // Refresh features cuando la app vuelve al primer plano.
  // Garantiza que trial expirado, B2B activado u otros cambios de features
  // sean visibles sin que el atleta tenga que hacer logout/login.
  const refreshUser = useCallback(async () => {
    try {
      const fresh = await getMe()
      setUser(fresh)
    } catch {
      // 401 ya se maneja en apiFetch (limpia token + store → redirige a login)
    }
  }, [setUser])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refreshUser()
    })
    return () => sub.remove()
  }, [refreshUser])

  // Foreground: recibir notificación — refrescar si es features_updated
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown> | undefined
      if (data?.type === 'features_updated') {
        refreshUser()
      }
    })
    return () => sub.remove()
  }, [refreshUser])

  // Tap en notificación (foreground, background o killed) → navegar a la pantalla correcta
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined
      const screen = data?.screen as string | undefined
      if (screen && SCREEN_ROUTES[screen]) {
        router.push(SCREEN_ROUTES[screen] as any)
      } else {
        // Fallback: abrir lista de notificaciones
        router.push('/(app)/notifications')
      }
    })
    return () => sub.remove()
  }, [router])

  return <Stack screenOptions={{ headerShown: false }} />
}
