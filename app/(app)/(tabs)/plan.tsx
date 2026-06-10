import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { getPlan, PlannedSession } from '../../../src/api/plan'
import { useAuthStore } from '../../../src/store/auth'
import UpgradeWall from '../../../src/components/UpgradeWall'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const SESSION_META: Record<string, { icon: string; color: string; bg: string }> = {
  RODAJE_Z2:    { icon: '🏃', color: '#22c55e', bg: '#f0fdf4' },
  FARTLEK:      { icon: '🏃', color: '#f97316', bg: '#fff7ed' },
  TIRADA_LARGA: { icon: '🏃', color: '#3b82f6', bg: '#eff6ff' },
  CICLA:        { icon: '🚴', color: '#8b5cf6', bg: '#f5f3ff' },
  NATACION:     { icon: '🏊', color: '#06b6d4', bg: '#ecfeff' },
  FUERZA:       { icon: '💪', color: '#f59e0b', bg: '#fffbeb' },
  DESCANSO:     { icon: '😴', color: '#9ca3af', bg: '#f9fafb' },
}

function SessionCard({ session, isToday }: { session: PlannedSession; isToday?: boolean }) {
  const meta = SESSION_META[session.type] ?? { icon: '🏅', color: '#6b7280', bg: '#f9fafb' }
  const isRest = session.type === 'DESCANSO'
  const stripColor = isToday ? '#f97316' : session.completed ? '#22c55e' : isRest ? '#d1d5db' : '#1e3a5f'

  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    }}>
      <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: stripColor }} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
              {isRest ? 'Descanso' : `${session.durationMin} min`}
            </Text>
            {!isRest && (
              <Text style={{ fontSize: 11, color: meta.color, fontFamily: 'Inter_600SemiBold',
                backgroundColor: meta.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 }}>
                Z{session.zoneTarget}
              </Text>
            )}
            {isToday && (
              <View style={{ backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: 'white' }}>HOY</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
            {session.sportLabel ?? session.type.toLowerCase().replace(/_/g, ' ')}
          </Text>
          {session.coachNote ? (
            <Text style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Inter_400Regular', marginTop: 3, fontStyle: 'italic' }}>
              {session.coachNote}
            </Text>
          ) : null}
        </View>
        {session.completed && (
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
        )}
      </View>
    </View>
  )
}

export default function PlanScreen() {
  const { user } = useAuthStore()
  const insets = useSafeAreaInsets()
  const { data: plan, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['plan'],
    queryFn: getPlan,
  })
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

  if (!user?.features?.plan) {
    return <UpgradeWall icon="📅" title="Plan de entrenamiento" description="Accede a tu plan periodizado con sesiones semanales personalizadas con el plan Pro." />
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  if (!plan) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>📋</Text>
        <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1e3a5f', textAlign: 'center' }}>
          Sin plan activo
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8 }}>
          Completa el onboarding para generar tu plan personalizado.
        </Text>
      </View>
    )
  }

  const today = new Date().getDay()
  const currentWeekNum = selectedWeek ?? plan.currentWeek
  const week = plan.weeks.find(w => w.weekNumber === currentWeekNum) ?? plan.weeks[0]
  const sortedSessions = [...(week?.sessions ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
  const isCurrentWeek = currentWeekNum === plan.currentWeek

  const completedInWeek = sortedSessions.filter(s => s.completed && s.type !== 'DESCANSO').length
  const totalInWeek = sortedSessions.filter(s => s.type !== 'DESCANSO').length
  const progressPct = totalInWeek > 0 ? completedInWeek / totalInWeek : 0

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
      contentContainerStyle={{ paddingBottom: 32, gap: 12 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Gradient Header */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 20 }}
      >
        <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>
          Mi Plan
        </Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {plan.name} · {plan.totalWeeks} semanas
        </Text>
      </LinearGradient>

      {/* Week selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 }}>
        {plan.weeks.map(w => {
          const active = w.weekNumber === currentWeekNum
          const isCurrent = w.weekNumber === plan.currentWeek
          return (
            <TouchableOpacity
              key={w.weekNumber}
              onPress={() => setSelectedWeek(w.weekNumber)}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
                backgroundColor: active ? '#1e3a5f' : 'white',
                borderWidth: active ? 0 : 1,
                borderColor: isCurrent ? '#f97316' : '#e5e7eb',
                flexDirection: 'row', alignItems: 'center', gap: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: active ? 0.15 : 0.04,
                shadowRadius: 4,
                elevation: active ? 3 : 1,
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold',
                color: active ? 'white' : (isCurrent ? '#f97316' : '#374151') }}>
                S{w.weekNumber}
              </Text>
              {isCurrent && !active && (
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#f97316' }} />
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Week summary */}
      {week && (
        <View style={{ marginHorizontal: 16, backgroundColor: 'white', borderRadius: 16, padding: 16,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {week.phase}
              </Text>
              <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.3, marginTop: 2 }}>
                Semana {week.weekNumber}
              </Text>
            </View>
            <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
              {completedInWeek}<Text style={{ fontSize: 14, color: '#9ca3af', fontFamily: 'Inter_500Medium' }}>/{totalInWeek}</Text>
            </Text>
          </View>
          {/* Progress bar */}
          <View style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 6, width: `${progressPct * 100}%`, backgroundColor: '#f97316', borderRadius: 3 }} />
          </View>
        </View>
      )}

      {/* Sessions by day */}
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
          Sesiones
        </Text>
        {sortedSessions.map(session => (
          <View key={session.id}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#9ca3af', marginBottom: 4, marginLeft: 4 }}>
              {DAY_LABELS[session.dayOfWeek] ?? `Día ${session.dayOfWeek}`}
            </Text>
            <SessionCard session={session} isToday={isCurrentWeek && session.dayOfWeek === today} />
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
