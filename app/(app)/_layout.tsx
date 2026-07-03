import { useEffect, useCallback, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '../../src/store/auth'
import { getMe } from '../../src/api/auth'
import { registerForPushNotificationsAsync } from '../../src/lib/notifications'
import { registerPushToken } from '../../src/api/notifications'

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
      .catch(() => {})
  }, [user])

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

  // Escuchar notificaciones en foreground — si el coach activó features, refrescar JWT
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown> | undefined
      if (data?.type === 'features_updated') {
        refreshUser()
      }
    })
    return () => sub.remove()
  }, [refreshUser])

  return <Stack screenOptions={{ headerShown: false }} />
}
