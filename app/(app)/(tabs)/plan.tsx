import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { getPlan, PlannedSession } from '../../../src/api/plan'

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

function SessionCard({ session }: { session: PlannedSession }) {
  const meta = SESSION_META[session.type] ?? { icon: '🏅', color: '#6b7280', bg: '#f9fafb' }

  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      opacity: session.type === 'DESCANSO' ? 0.6 : 1,
    }}>
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
            {session.type === 'DESCANSO' ? 'Descanso' : `${session.durationMin} min`}
          </Text>
          {session.type !== 'DESCANSO' && (
            <Text style={{ fontSize: 11, color: meta.color, fontFamily: 'Inter_600SemiBold',
              backgroundColor: meta.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 }}>
              Z{session.zoneTarget}
            </Text>
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
  )
}

export default function PlanScreen() {
  const insets = useSafeAreaInsets()
  const { data: plan, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['plan'],
    queryFn: getPlan,
  })

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  if (!plan) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 24 }}>
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

  const currentWeekNum = selectedWeek ?? plan.currentWeek
  const week = plan.weeks.find(w => w.weekNumber === currentWeekNum) ?? plan.weeks[0]
  const sortedSessions = [...(week?.sessions ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  const completedInWeek = sortedSessions.filter(s => s.completed && s.type !== 'DESCANSO').length
  const totalInWeek = sortedSessions.filter(s => s.type !== 'DESCANSO').length

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View>
        <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5 }}>
          Plan
        </Text>
        <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
          {plan.name} · {plan.totalWeeks} semanas
        </Text>
      </View>

      {/* Week selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {plan.weeks.map(w => {
          const active = w.weekNumber === currentWeekNum
          const isCurrent = w.weekNumber === plan.currentWeek
          return (
            <TouchableOpacity
              key={w.weekNumber}
              onPress={() => setSelectedWeek(w.weekNumber)}
              style={{
                paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
                backgroundColor: active ? '#1e3a5f' : 'white',
                borderWidth: 1,
                borderColor: active ? '#1e3a5f' : (isCurrent ? '#f97316' : '#e5e7eb'),
                flexDirection: 'row', alignItems: 'center', gap: 4,
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
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {week.phase}
            </Text>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.3, marginTop: 2 }}>
              Semana {week.weekNumber}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
              {completedInWeek}
              <Text style={{ fontSize: 14, color: '#9ca3af', fontFamily: 'Inter_500Medium' }}>/{totalInWeek}</Text>
            </Text>
            <Text style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>completadas</Text>
          </View>
        </View>
      )}

      {/* Sessions by day */}
      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Sesiones
      </Text>
      {sortedSessions.map(session => (
        <View key={session.id}>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#9ca3af', marginBottom: 6, marginLeft: 4 }}>
            {DAY_LABELS[session.dayOfWeek] ?? `Día ${session.dayOfWeek}`}
          </Text>
          <SessionCard session={session} />
        </View>
      ))}
    </ScrollView>
  )
}
