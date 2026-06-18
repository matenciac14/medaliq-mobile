import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { getMe, logout } from '../api/auth'
import { getToken } from '../api/client'
import { useAuthStore } from '../store/auth'

export function useBootstrap() {
  const { setUser, setLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    async function boot() {
      try {
        const token = await getToken()
        if (!token) {
          setUser(null)
          setLoading(false)
          router.replace('/(auth)/login')
          return
        }

        const user = await getMe()
        setUser(user)

        if (!user.onboardingCompleted) {
          router.replace('/(auth)/onboarding')
        } else {
          router.replace('/(app)/dashboard' as any)
        }
      } catch {
        setUser(null)
        await logout()
        router.replace('/(auth)/login')
      } finally {
        setLoading(false)
      }
    }

    boot()
  }, [])
}
