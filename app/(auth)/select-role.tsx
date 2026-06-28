import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { setMobileRole } from '../../src/api/auth'
import { useAuthStore } from '../../src/store/auth'

export default function SelectRoleScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { setUser } = useAuthStore()
  const [loading, setLoading] = useState<'ATHLETE' | 'COACH' | null>(null)

  async function handleSelect(role: 'ATHLETE' | 'COACH') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setLoading(role)
    try {
      const user = await setMobileRole(role)
      setUser(user)
      if (role === 'COACH') {
        // Coaches no tienen onboarding mobile — van al dashboard
        router.replace('/(app)/(tabs)/dashboard' as any)
      } else {
        router.replace('/(auth)/onboarding')
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo configurar el rol.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1e3a5f', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 32 }}>

        {/* Header */}
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 18,
            backgroundColor: '#f97316',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: 'white', fontSize: 36, fontFamily: 'Inter_900Black', lineHeight: 40 }}>M</Text>
          </View>
          <Text style={{ color: 'white', fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 8 }}>
            ¿Cómo usarás Medaliq?
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
            Elige tu perfil para empezar
          </Text>
        </View>

        {/* Cards */}
        <View style={{ gap: 12 }}>
          {/* Atleta */}
          <TouchableOpacity
            onPress={() => handleSelect('ATHLETE')}
            disabled={loading !== null}
            activeOpacity={0.85}
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: loading === 'ATHLETE' ? '#f97316' : 'rgba(255,255,255,0.15)',
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <View style={{
              width: 52, height: 52, borderRadius: 14,
              backgroundColor: 'rgba(249,115,22,0.15)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 26 }}>🏃</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontSize: 17, fontFamily: 'Inter_700Bold' }}>Soy atleta</Text>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                Sigo mi plan y registro mis entrenamientos
              </Text>
            </View>
            {loading === 'ATHLETE'
              ? <ActivityIndicator color="#f97316" />
              : <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }}>›</Text>
            }
          </TouchableOpacity>

          {/* Coach */}
          <TouchableOpacity
            onPress={() => handleSelect('COACH')}
            disabled={loading !== null}
            activeOpacity={0.85}
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: loading === 'COACH' ? '#f97316' : 'rgba(255,255,255,0.15)',
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <View style={{
              width: 52, height: 52, borderRadius: 14,
              backgroundColor: 'rgba(249,115,22,0.15)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 26 }}>📋</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontSize: 17, fontFamily: 'Inter_700Bold' }}>Soy coach</Text>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                Gestiono mis atletas y creo planes
              </Text>
            </View>
            {loading === 'COACH'
              ? <ActivityIndicator color="#f97316" />
              : <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }}>›</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
          Este ajuste no se puede cambiar después
        </Text>
      </View>
    </View>
  )
}
