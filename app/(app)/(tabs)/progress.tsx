import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { getProgress } from '../../../src/api/progress'
import { useAuthStore } from '../../../src/store/auth'
import UpgradeWall from '../../../src/components/UpgradeWall'

const PHASE_COLORS: Record<string, string> = {
  BASE: '#3b82f6',
  DESARROLLO: '#f59e0b',
  ESPECIFICO: '#f97316',
  AFINAMIENTO: '#22c55e',
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#111827' }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'center' }}>{sub}</Text> : null}
    </View>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {title}
    </Text>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <View style={{ height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
    </View>
  )
}

export default function ProgressScreen() {
  const { user } = useAuthStore()
  const insets = useSafeAreaInsets()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['progress'],
    queryFn: getProgress,
    enabled: !!(user?.features?.progress),
  })

  useFocusEffect(useCallback(() => { refetch() }, [refetch]))

  if (!user?.features?.progress) {
    return <UpgradeWall icon="📈" title="Progreso" description="Visualiza tu evolución de peso, bienestar y adherencia al plan con el plan Pro." />
  }

  if (isLoading || !data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  // Últimos 4 puntos de bienestar para el resumen
  const lastWellbeing = data.wellbeingPoints.slice(-4)
  const energyPoints = lastWellbeing.filter(p => p.energyLevel != null)
  const stressPoints = lastWellbeing.filter(p => p.stressLevel != null)
  const motivationPoints = lastWellbeing.filter(p => p.motivationLevel != null)
  const avgEnergy = energyPoints.length > 0
    ? Math.round(energyPoints.reduce((a, p) => a + (p.energyLevel ?? 0), 0) / energyPoints.length * 10) / 10
    : null
  const avgStress = stressPoints.length > 0
    ? Math.round(stressPoints.reduce((a, p) => a + (p.stressLevel ?? 0), 0) / stressPoints.length * 10) / 10
    : null
  const avgMotivation = motivationPoints.length > 0
    ? Math.round(motivationPoints.reduce((a, p) => a + (p.motivationLevel ?? 0), 0) / motivationPoints.length * 10) / 10
    : null

  // Peso — primer y último punto
  const firstWeight = data.weightPoints[0] ?? null
  const lastWeight = data.weightPoints[data.weightPoints.length - 1] ?? null
  const weightDelta = firstWeight && lastWeight && firstWeight.week !== lastWeight.week
    ? Math.round((lastWeight.kg - firstWeight.kg) * 10) / 10
    : null
  const weightProgressPct = firstWeight && lastWeight && data.weightGoal && firstWeight.kg !== data.weightGoal
    ? Math.min(100, Math.max(0, Math.round(((firstWeight.kg - lastWeight.kg) / (firstWeight.kg - data.weightGoal)) * 100)))
    : null

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40, paddingHorizontal: 16, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View>
        <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5 }}>Progreso</Text>
        <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>Tu evolución semana a semana</Text>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatCard label="Check-ins" value={String(data.totalCheckIns)} />
        <StatCard label="Adherencia" value={`${data.overallAdherencePct}%`} sub="promedio" />
        <StatCard label="Gym" value={String(data.gymSessionsCompleted)} sub="sesiones" />
      </View>

      {/* Peso */}
      {data.weightPoints.length > 0 && (
        <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, gap: 14, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <SectionHeader title="Evolución de peso" />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Text style={{ fontSize: 32, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -1 }}>
                {lastWeight?.kg} <Text style={{ fontSize: 16, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>kg</Text>
              </Text>
              {weightDelta != null && (
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: weightDelta < 0 ? '#22c55e' : '#f97316', marginTop: 2 }}>
                  {weightDelta > 0 ? '+' : ''}{weightDelta} kg desde inicio
                </Text>
              )}
            </View>
            {data.weightGoal && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>Meta</Text>
                <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#374151' }}>{data.weightGoal} kg</Text>
              </View>
            )}
          </View>

          {weightProgressPct != null && (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>Progreso hacia meta</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#22c55e' }}>{weightProgressPct}%</Text>
              </View>
              <MiniBar value={weightProgressPct} max={100} color="#22c55e" />
            </View>
          )}

          {/* Mini sparkline de puntos de peso */}
          {data.weightPoints.length > 1 && (
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#9ca3af' }}>Historial por semana</Text>
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                {data.weightPoints.slice(-8).map((p, i) => (
                  <View key={i} style={{ alignItems: 'center', gap: 2 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>{p.kg}</Text>
                    <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#d1d5db' }}>S{p.week}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Bienestar */}
      {lastWellbeing.length > 0 && (
        <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, gap: 14, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <SectionHeader title={`Bienestar · últimas ${lastWellbeing.length} semanas`} />

          {avgEnergy != null && (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#374151' }}>Energía</Text>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#f97316' }}>{avgEnergy}/10</Text>
              </View>
              <MiniBar value={avgEnergy} max={10} color="#f97316" />
            </View>
          )}

          {avgMotivation != null && (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#374151' }}>Motivación</Text>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#22c55e' }}>{avgMotivation}/10</Text>
              </View>
              <MiniBar value={avgMotivation} max={10} color="#22c55e" />
            </View>
          )}

          {avgStress != null && (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#374151' }}>Estrés</Text>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#8b5cf6' }}>{avgStress}/10</Text>
              </View>
              <MiniBar value={avgStress} max={10} color="#8b5cf6" />
            </View>
          )}
        </View>
      )}

      {/* Adherencia semanal */}
      {data.weeks.length > 0 && (
        <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <SectionHeader title="Adherencia al plan" />
          {data.weeks.slice(-8).map((w, i) => (
            <View key={i} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Semana {w.weekNumber}</Text>
                  <View style={{ backgroundColor: PHASE_COLORS[w.phase] ?? '#6b7280', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: 'white' }}>{w.phase}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: w.adherencePct >= 80 ? '#22c55e' : w.adherencePct >= 50 ? '#f59e0b' : '#ef4444' }}>
                  {w.adherencePct}%
                </Text>
              </View>
              <MiniBar value={w.adherencePct} max={100} color={w.adherencePct >= 80 ? '#22c55e' : w.adherencePct >= 50 ? '#f59e0b' : '#ef4444'} />
            </View>
          ))}
        </View>
      )}

      {/* Empty state */}
      {data.totalCheckIns === 0 && data.weeks.length === 0 && (
        <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 32, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 40 }}>📊</Text>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827', textAlign: 'center' }}>Aún sin datos</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', lineHeight: 20 }}>
            Completa tu primer check-in semanal para ver tu progreso aquí.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}
