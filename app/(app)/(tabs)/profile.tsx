import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native'
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

  const plan = (user as any)?.userPlan ?? 'INACTIVE'
  const planLabel: Record<string, string> = {
    INACTIVE: 'Inactivo',
    TRIAL: 'Trial 30 días',
    PRO: 'Pro',
  }

  const cardStyle = {
    backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, overflow: 'hidden' as const,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  }
  const sectionTitleStyle = {
    fontSize: 11, fontFamily: 'Inter_600SemiBold' as const, color: '#9ca3af',
    textTransform: 'uppercase' as const, letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
      contentContainerStyle={{ paddingBottom: 32, gap: 14 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Gradient hero header with avatar */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 20, paddingBottom: 28, alignItems: 'center' }}
      >
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontSize: 24, fontFamily: 'Inter_900Black' }}>{initials}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: 'white' }}>{user?.name ?? 'Atleta'}</Text>
        <View style={{
          marginTop: 8, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
          backgroundColor: plan === 'TRIAL' ? '#f97316' : plan === 'PRO' ? '#22c55e' : 'rgba(255,255,255,0.2)',
        }}>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
            {plan === 'TRIAL' ? '✦ Trial 30 días' : plan === 'PRO' ? '✦ Pro' : 'Inactivo'}
          </Text>
        </View>
      </LinearGradient>

      {/* Trial banner */}
      {plan === 'TRIAL' && (
        <View style={{ marginHorizontal: 16, backgroundColor: '#fff7ed', borderRadius: 14, padding: 14,
          borderLeftWidth: 4, borderLeftColor: '#f97316' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#92400e' }}>
            Trial activo — acceso completo por 30 días
          </Text>
          <Text style={{ fontSize: 12, color: '#c2410c', fontFamily: 'Inter_400Regular', marginTop: 3 }}>
            Plan, check-in, nutrición y gym disponibles.
          </Text>
        </View>
      )}

      {/* Cuenta */}
      <View>
        <Text style={sectionTitleStyle}>Cuenta</Text>
        <View style={cardStyle}>
          <MenuItem icon="person-outline" label="Nombre" value={firstName} />
          <View style={{ height: 1, backgroundColor: '#f1f5f9', marginLeft: 66 }} />
          <MenuItem icon="mail-outline" label="Email" value={user?.email ?? ''} />
          <View style={{ height: 1, backgroundColor: '#f1f5f9', marginLeft: 66 }} />
          <MenuItem icon="medal-outline" label="Plan" value={planLabel[plan] ?? plan} />
        </View>
      </View>

      {/* Mensajes */}
      <View>
        <Text style={sectionTitleStyle}>Coach</Text>
        <View style={cardStyle}>
          <MenuItem icon="chatbubble-ellipses-outline" label="Mensajes" onPress={() => router.push('/(app)/messages' as any)} />
        </View>
      </View>

      {/* Soporte */}
      <View>
        <Text style={sectionTitleStyle}>Soporte</Text>
        <View style={cardStyle}>
          <MenuItem icon="help-circle-outline" label="Ayuda y FAQ" onPress={() => Linking.openURL('https://medaliq.com/help')} />
          <View style={{ height: 1, backgroundColor: '#f1f5f9', marginLeft: 66 }} />
          <MenuItem icon="chatbubble-outline" label="Contactar soporte" onPress={() => Linking.openURL('mailto:hola@medaliq.com')} />
        </View>
      </View>

      {/* Sesión */}
      <View style={cardStyle}>
        <MenuItem icon="log-out-outline" label="Cerrar sesión" onPress={handleLogout} danger />
      </View>

      <Text style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', fontFamily: 'Inter_400Regular', paddingHorizontal: 16 }}>
        Medaliq v1.0 · Hecho en Colombia 🇨🇴
      </Text>
    </ScrollView>
  )
}
