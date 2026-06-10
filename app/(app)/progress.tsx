import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { getProgress } from '../../src/api/progress'
import { useAuthStore } from '../../src/store/auth'
import UpgradeWall from '../../src/components/UpgradeWall'

const PHASE_COLOR: Record<string, string> = {
  BASE: '#1e3a5f',
  DESARROLLO: '#f97316',
  ESPECIFICO: '#dc2626',
  AFINAMIENTO: '#7c3aed',
}

function MiniBarChart({
  data,
  minVal,
  maxVal,
  barColor,
  accentLast = true,
}: {
  data: { label: string; value: number }[]
  minVal: number
  maxVal: number
  barColor: string
  accentLast?: boolean
}) {
  const range = maxVal - minVal || 1
  const barH = 52
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 12 }}>
      {data.map((d, i) => {
        const h = Math.max(4, Math.round(((d.value - minVal) / range) * barH))
        const isLast = i === data.length - 1
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View style={{ width: '100%', height: h, borderRadius: 6, backgroundColor: accentLast && isLast ? barColor : barColor + '66' }} />
            <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{d.label}</Text>
          </View>
        )
      })}
    </View>
  )
}

export default function ProgressScreen() {
  const { user } = useAuthStore()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data, isLoading } = useQuery({ queryKey: ['progress'], queryFn: getProgress })

  if (!user?.features?.progress) {
    return <UpgradeWall icon="📊" title="Progreso" description="Visualiza tu evolución de peso, FC y adherencia semana a semana con el plan Pro." />
  }

  const GradientHeader = () => (
    <LinearGradient
      colors={['#1e3a5f', '#2d5a8e']}
      style={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 16, gap: 12 }}
    >
      <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', padding: 4 }}>
        <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
      <View>
        <Text style={{ color: 'white', fontSize: 22, fontFamily: 'Inter_900Black', letterSpacing: -0.5 }}>Progreso</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>Tu evolución semana a semana</Text>
      </View>
    </LinearGradient>
  )

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
        <GradientHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      </View>
    )
  }

  const hasData = (data?.weightPoints.length ?? 0) > 0 || (data?.hrPoints.length ?? 0) > 0

  if (!hasData) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
        <GradientHeader />
        <View style={{ alignItems: 'center', marginTop: 80, gap: 12, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 48 }}>📈</Text>
          <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1e3a5f', textAlign: 'center' }}>
            Aún no hay datos de progreso
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', maxWidth: 260 }}>
            Haz tu primer check-in semanal para ver tu evolución aquí.
          </Text>
        </View>
      </View>
    )
  }

  const weightData = data!.weightPoints.map(p => ({ label: `S${p.week}`, value: p.kg }))
  const hrData = data!.hrPoints.map(p => ({ label: `S${p.week}`, value: p.bpm }))
  const lastWeight = data!.weightPoints.at(-1)?.kg ?? null
  const firstWeight = data!.weightPoints[0]?.kg ?? null
  const lastHr = data!.hrPoints.at(-1)?.bpm ?? null
  const weightDiff = lastWeight !== null && firstWeight !== null ? +(lastWeight - firstWeight).toFixed(1) : null

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <GradientHeader />
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, paddingHorizontal: 20, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >

      {/* Stats row */}
      <View style={{ backgroundColor: '#1e3a5f0f', borderWidth: 1, borderColor: '#1e3a5f26', borderRadius: 16, padding: 16, flexDirection: 'row' }}>
        {[
          { v: String(data!.weeks.length), l: 'Semanas' },
          { v: `${data!.overallAdherencePct}%`, l: 'Adherencia' },
          { v: String(data!.totalCheckIns), l: 'Check-ins' },
        ].map((s, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            {i > 0 && <View style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 1, backgroundColor: '#1e3a5f33' }} />}
            <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>{s.v}</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 2 }}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Peso */}
      {weightData.length > 0 && (
        <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', padding: 20 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>PESO</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5 }}>
              {lastWeight} kg
            </Text>
            {weightDiff !== null && (
              <View style={{ backgroundColor: weightDiff <= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: weightDiff <= 0 ? '#16a34a' : '#dc2626' }}>
                  {weightDiff > 0 ? '+' : ''}{weightDiff} kg
                </Text>
              </View>
            )}
          </View>
          {data!.weightGoal && (
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
              Objetivo: {data!.weightGoal} kg
            </Text>
          )}
          <MiniBarChart
            data={weightData}
            minVal={Math.min(...weightData.map(d => d.value)) - 1}
            maxVal={Math.max(...weightData.map(d => d.value)) + 1}
            barColor="#1e3a5f"
          />
        </View>
      )}

      {/* FC Reposo */}
      {hrData.length > 0 && (
        <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', padding: 20 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>FC REPOSO</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5 }}>
              {lastHr} bpm
            </Text>
            {lastHr && (
              <View style={{ backgroundColor: lastHr < 60 ? '#dcfce7' : lastHr < 70 ? '#fef9c3' : '#fee2e2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: lastHr < 60 ? '#16a34a' : lastHr < 70 ? '#ca8a04' : '#dc2626' }}>
                  {lastHr < 60 ? '✓ Excelente' : lastHr < 70 ? '✓ Normal' : '⚠ Alta'}
                </Text>
              </View>
            )}
          </View>
          <MiniBarChart
            data={hrData}
            minVal={Math.min(...hrData.map(d => d.value)) - 3}
            maxVal={Math.max(...hrData.map(d => d.value)) + 3}
            barColor="#ef4444"
          />
        </View>
      )}

      {/* Adherencia por semana */}
      {data!.weeks.length > 0 && (
        <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', padding: 20 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            ADHERENCIA AL PLAN
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
            {data!.weeks.map((w, i) => {
              const h = Math.max(4, Math.round((w.adherencePct / 100) * 72))
              const color = PHASE_COLOR[w.phase] ?? '#1e3a5f'
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 8, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{w.adherencePct}%</Text>
                  <View style={{ width: '100%', height: h, borderRadius: 4, backgroundColor: color }} />
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>S{w.weekNumber}</Text>
                </View>
              )
            })}
          </View>
          {/* Leyenda fases */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {Object.entries(PHASE_COLOR).map(([phase, color]) => (
              <View key={phase} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>{phase.charAt(0) + phase.slice(1).toLowerCase()}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
    </View>
  )
}
