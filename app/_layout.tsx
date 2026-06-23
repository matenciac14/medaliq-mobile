import { useEffect } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from '@expo-google-fonts/inter'
import { QueryClient, QueryClientProvider, QueryCache, focusManager } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ApiError } from '../src/api/client'
import { useAuthStore } from '../src/store/auth'
import { getMe } from '../src/api/auth'

SplashScreen.preventAutoHideAsync()

// React Native no tiene eventos de window focus — usar AppState para que
// React Query refresque queries cuando la app vuelve al primer plano.
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
    handleFocus(state === 'active')
  })
  return () => sub.remove()
})

// Cuando cualquier query devuelve 402 (feature gateada), refrescar el usuario
// desde el servidor para actualizar features en el store. Esto provoca que las
// screens re-rendericen con features.X=false y muestren UpgradeWall.
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.statusCode === 402) {
        getMe()
          .then((fresh) => useAuthStore.getState().setUser(fresh))
          .catch(() => {/* 401 ya limpia el store en apiFetch */})
      }
    },
  }),
  defaultOptions: {
    queries: { retry: (count, error) => {
      // No reintentar en errores de negocio (4xx)
      if (error instanceof ApiError && error.statusCode < 500) return false
      return count < 2
    }, staleTime: 30_000 },
  },
})

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor="#1e3a5f" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
