import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { getToken } from '../src/api/client'
import { getMe } from '../src/api/auth'
import { useAuthStore } from '../src/store/auth'

export default function Index() {
  const router = useRouter()
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    async function boot() {
      try {
        const token = await getToken()
        if (!token) {
          router.replace('/(auth)/login')
          return
        }
        const user = await getMe()
        setUser(user)
        if (!user.onboardingCompleted) {
          router.replace('/(auth)/onboarding')
        } else if (user.userPlan === 'INACTIVE') {
          router.replace('/(app)/upgrade')
        } else {
          router.replace('/(app)/(tabs)/dashboard')
        }
      } catch {
        router.replace('/(auth)/login')
      } finally {
        setLoading(false)
      }
    }
    boot()
  }, [])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e3a5f' }}>
      <ActivityIndicator color="#f97316" size="large" />
    </View>
  )
}
