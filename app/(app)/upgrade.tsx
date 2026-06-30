import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/store/auth'
import { logout } from '../../src/api/auth'
import { useQueryClient } from '@tanstack/react-query'

const FEATURES = [
  { icon: 'calendar-outline', text: 'Plan de entrenamiento adaptativo' },
  { icon: 'checkmark-circle-outline', text: 'Check-in semanal con ajuste automático' },
  { icon: 'nutrition-outline', text: 'Nutrición sincronizada con tu entrenamiento' },
  { icon: 'trending-up-outline', text: 'Gráficas de progreso y métricas' },
  { icon: 'barbell-outline', text: 'Gym tracker con progresión de cargas' },
  { icon: 'flash-outline', text: 'Soporte por chat incluido' },
]

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { setUser } = useAuthStore()
  const queryClient = useQueryClient()

  async function handleLogout() {
    await logout()
    queryClient.clear()
    setUser(null)
    router.replace('/(auth)/login')
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 24, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' }}
      >
        <View style={{
          width: 72, height: 72, borderRadius: 20,
          backgroundColor: '#f97316',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <Text style={{ color: 'white', fontSize: 36, fontFamily: 'Inter_900Black', lineHeight: 40 }}>M</Text>
        </View>
        <Text style={{ color: 'white', fontSize: 24, fontFamily: 'Inter_900Black', textAlign: 'center' }}>
          Tu trial ha finalizado
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
          Para seguir entrenando con tu plan personalizado,{'\n'}activa tu suscripción Pro.
        </Text>
      </LinearGradient>

      {/* Features */}
      <View style={{ marginHorizontal: 16, marginTop: 20 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#64748b', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 }}>
          Incluido en Pro
        </Text>
        <View style={{
          backgroundColor: 'white', borderRadius: 16,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
          overflow: 'hidden',
        }}>
          {FEATURES.map((f, i) => (
            <View key={i}>
              {i > 0 && <View style={{ height: 1, backgroundColor: '#f1f5f9', marginLeft: 52 }} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={f.icon as any} size={18} color="#f97316" />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: '#1e293b' }}>{f.text}</Text>
                <Ionicons name="checkmark" size={16} color="#22c55e" />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Price card */}
      <View style={{ marginHorizontal: 16, marginTop: 20 }}>
        <View style={{
          backgroundColor: 'white', borderRadius: 16,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
          padding: 20, alignItems: 'center',
        }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#64748b', letterSpacing: 0.4 }}>
            Plan Pro
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8, gap: 4 }}>
            <Text style={{ fontSize: 40, fontFamily: 'Inter_900Black', color: '#1e3a5f', lineHeight: 48 }}>$15</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#94a3b8', paddingBottom: 8 }}>/mes</Text>
          </View>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#94a3b8', marginTop: 4 }}>
            Cancela cuando quieras
          </Text>
        </View>
      </View>

      {/* CTA */}
      <View style={{ marginHorizontal: 16, marginTop: 16, gap: 10 }}>
        <TouchableOpacity
          onPress={() => Linking.openURL('https://medaliq.com/upgrade')}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#f97316',
            borderRadius: 14,
            paddingVertical: 18,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>
            Activar Pro — $15/mes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          style={{ paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 14, fontFamily: 'Inter_400Regular' }}>
            Cerrar sesión
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
