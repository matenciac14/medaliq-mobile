import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { getDashboard } from '../../../src/api/dashboard'
import { useAuthStore } from '../../../src/store/auth'

const SESSION_ICONS: Record<string, string> = {
  RODAJE_Z2: '🏃', FARTLEK: '🏃', TIRADA_LARGA: '🏃',
  CICLA: '🚴', NATACION: '🏊', FUERZA: '💪', DESCANSO: '😴',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function DashboardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()
  const firstName = (user?.name ?? 'Atleta').split(' ')[0]

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  const d = data!

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 24, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5 }}>
            {getGreeting()}, {firstName}
          </Text>
          {d.planData && (
            <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
              Semana {d.planData.currentWeek}/{d.planData.totalWeeks} · {d.planData.phase}
            </Text>
          )}
        </View>
        {d.trialDaysLeft !== null && d.trialDaysLeft <= 7 && (
          <View style={{ backgroundColor: '#fef3c7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#92400e' }}>
              {d.trialDaysLeft}d trial
            </Text>
          </View>
        )}
      </View>

      {/* Sesión de hoy */}
      {d.todaySession ? (
        <View style={{ borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}>
          <LinearGradient colors={['#1e3a5f', '#2d5a8e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            <Text style={{ fontSize: 40 }}>{SESSION_ICONS[d.todaySession.type] ?? '🏅'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontSize: 20, fontFamily: 'Inter_900Black', letterSpacing: -0.3 }}>
                {d.todaySession.durationMin} min · Zona {d.todaySession.zoneTarget}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                {d.todaySession.type.toLowerCase().replace(/_/g, ' ')}
              </Text>
            </View>
            {d.todaySession.completed && (
              <View style={{ backgroundColor: '#22c55e', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: 'white', fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>Hecha</Text>
              </View>
            )}
          </LinearGradient>

          <View style={{ backgroundColor: 'white', padding: 16, gap: 12 }}>
            {d.todaySession.detailText ? (
              <Text style={{ color: '#374151', fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
                {d.todaySession.detailText}
              </Text>
            ) : null}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                router.push({
                  pathname: '/(app)/log',
                  params: {
                    sessionId: d.todaySession!.id,
                    type: d.todaySession!.type,
                    duration: String(d.todaySession!.durationMin),
                    zone: d.todaySession!.zoneTarget,
                  },
                })
              }}
              activeOpacity={0.85}
              style={{ backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>Registrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 28 }}>😴</Text>
          <View>
            <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>Día de descanso</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>Recupera bien hoy</Text>
          </View>
        </View>
      )}

      {/* Métricas */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {d.metrics.weightKg && (
          <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Peso</Text>
            <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -1, marginTop: 4 }}>
              {d.metrics.weightKg}<Text style={{ fontSize: 14, color: '#9ca3af', fontFamily: 'Inter_500Medium' }}> kg</Text>
            </Text>
          </View>
        )}
        {d.metrics.hrResting && (
          <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>FC Reposo</Text>
            <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -1, marginTop: 4 }}>
              {d.metrics.hrResting}<Text style={{ fontSize: 14, color: '#9ca3af', fontFamily: 'Inter_500Medium' }}> bpm</Text>
            </Text>
          </View>
        )}
        {d.planData && d.totalTraining > 0 && (
          <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Semana</Text>
            <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -1, marginTop: 4 }}>
              {d.completedCount}/{d.totalTraining}
            </Text>
          </View>
        )}
      </View>

      {/* Acceso rápido */}
      {d.checkinPending && (
        <TouchableOpacity
          onPress={() => router.push('/(app)/(tabs)/checkin')}
          activeOpacity={0.85}
          style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#9a3412' }}>Check-in semanal pendiente</Text>
            <Text style={{ fontSize: 12, color: '#c2410c', fontFamily: 'Inter_400Regular', marginTop: 2 }}>Toma 5 minutos · ajusta tu plan</Text>
          </View>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#f97316' }}>→</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}
