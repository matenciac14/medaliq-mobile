import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../../../src/store/auth'
import { logout } from '../../../src/api/auth'
import { useQueryClient } from '@tanstack/react-query'

type MenuItemProps = {
  icon: string
  label: string
  value?: string
  onPress?: () => void
  danger?: boolean
}

function MenuItem({ icon, label, value, onPress, danger }: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 15, paddingHorizontal: 16,
      }}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: danger ? '#fef2f2' : '#f3f4f6',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={icon as any} size={18} color={danger ? '#ef4444' : '#374151'} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium', color: danger ? '#ef4444' : '#111827' }}>
        {label}
      </Text>
      {value ? (
        <Text style={{ fontSize: 13, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>{value}</Text>
      ) : null}
      {onPress && !danger ? (
        <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
      ) : null}
    </TouchableOpacity>
  )
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()

  const firstName = (user?.name ?? 'Atleta').split(' ')[0]
  const initials = (user?.name ?? 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          await logout()
          queryClient.clear()
          setUser(null)
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  const plan = (user as any)?.userPlan ?? 'FREE'
  const planLabel: Record<string, string> = {
    FREE: 'Free',
    TRIAL: 'Trial 30 días',
    PRO: 'Pro',
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header avatar */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5, marginBottom: 16 }}>
          Perfil
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <LinearGradient
            colors={['#1e3a5f', '#2d5a8e']}
            style={{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: 'white', fontSize: 22, fontFamily: 'Inter_900Black' }}>{initials}</Text>
          </LinearGradient>
          <View>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#111827' }}>{user?.name ?? 'Atleta'}</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>{user?.email}</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5,
              backgroundColor: plan === 'TRIAL' ? '#fff7ed' : plan === 'PRO' ? '#f0fdf4' : '#f3f4f6',
              borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
            }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: plan === 'TRIAL' ? '#f97316' : plan === 'PRO' ? '#22c55e' : '#9ca3af' }} />
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: plan === 'TRIAL' ? '#92400e' : plan === 'PRO' ? '#166534' : '#6b7280' }}>
                {planLabel[plan] ?? plan}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Plan card if trial */}
      {plan === 'TRIAL' && (
        <View style={{ marginHorizontal: 16, backgroundColor: '#fff7ed', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#fed7aa' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#92400e' }}>
            Trial activo — acceso completo por 30 días
          </Text>
          <Text style={{ fontSize: 12, color: '#c2410c', fontFamily: 'Inter_400Regular', marginTop: 3 }}>
            Plan, check-in, nutrición, gym y AI coach disponibles.
          </Text>
        </View>
      )}

      {/* Cuenta */}
      <View style={{ backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Cuenta
          </Text>
        </View>
        <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />
        <MenuItem icon="person-outline" label="Nombre" value={firstName} />
        <View style={{ height: 1, backgroundColor: '#f3f4f6', marginLeft: 66 }} />
        <MenuItem icon="mail-outline" label="Email" value={user?.email ?? ''} />
        <View style={{ height: 1, backgroundColor: '#f3f4f6', marginLeft: 66 }} />
        <MenuItem icon="medal-outline" label="Plan" value={planLabel[plan] ?? plan} />
      </View>

      {/* Soporte */}
      <View style={{ backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Soporte
          </Text>
        </View>
        <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />
        <MenuItem icon="help-circle-outline" label="Ayuda y FAQ" onPress={() => {}} />
        <View style={{ height: 1, backgroundColor: '#f3f4f6', marginLeft: 66 }} />
        <MenuItem icon="chatbubble-outline" label="Contactar soporte" onPress={() => {}} />
      </View>

      {/* Sesión */}
      <View style={{ backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
        <MenuItem icon="log-out-outline" label="Cerrar sesión" onPress={handleLogout} danger />
      </View>

      <Text style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', fontFamily: 'Inter_400Regular', paddingHorizontal: 16 }}>
        Medaliq v1.0 · Hecho en Colombia 🇨🇴
      </Text>
    </ScrollView>
  )
}
