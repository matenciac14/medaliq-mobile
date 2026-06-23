import { useEffect, useCallback } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/auth'
import { getMe } from '../../src/api/auth'

export default function AppLayout() {
  const { user, isLoading, setUser } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login')
    }
  }, [user, isLoading])

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

  return <Stack screenOptions={{ headerShown: false }} />
}
