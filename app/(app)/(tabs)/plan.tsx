import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { getPlan, PlannedSession } from '../../../src/api/plan'
import { submitCheckin } from '../../../src/api/checkin'
import { getProgress } from '../../../src/api/progress'
import { useAuthStore } from '../../../src/store/auth'
import UpgradeWall from '../../../src/components/UpgradeWall'

type PlanTab = 'weeks' | 'progress' | 'checkin'

// ── Constants ──────────────────────────────────────────────────────
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

const PHASE_COLOR: Record<string, string> = {
  BASE: '#1e3a5f',
  DESARROLLO: '#f97316',
  ESPECIFICO: '#dc2626',
  AFINAMIENTO: '#7c3aed',
}

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

// ── SessionCard ────────────────────────────────────────────────────
function SessionCard({ session, isToday }: { session: PlannedSession; isToday?: boolean }) {
  const meta = SESSION_META[session.type] ?? { icon: '🏅', color: '#6b7280', bg: '#f9fafb' }
  const isRest = session.type === 'DESCANSO'
  const stripColor = isToday ? '#f97316' : session.completed ? '#22c55e' : isRest ? '#d1d5db' : '#1e3a5f'

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 14, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', ...SHADOW }}>
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

// ── MiniBarChart ───────────────────────────────────────────────────
function MiniBarChart({ data, minVal, maxVal, barColor, accentLast = true }: {
  data: { label: string; value: number }[]
  minVal: number; maxVal: number; barColor: string; accentLast?: boolean
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
            <View style={{ width: '100%', height: h, borderRadius: 6,
              backgroundColor: accentLast && isLast ? barColor : barColor + '66' }} />
            <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{d.label}</Text>
          </View>
        )
      })}
    </View>
  )
}

// ── ScaleSelector ──────────────────────────────────────────────────
function ScaleSelector({ label, value, onChange, low, high, color = '#f97316' }: {
  label: string; value: number; onChange: (v: number) => void
  low: string; high: string; color?: string
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{label}</Text>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color }}>{value > 0 ? value : '–'}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => { Haptics.selectionAsync(); onChange(n) }}
            activeOpacity={0.8}
            style={{
              flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
              backgroundColor: value === n ? color : 'white',
              borderWidth: 1.5,
              borderColor: value === n ? color : '#e5e7eb',
            }}
          >
            <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: value === n ? 'white' : '#6b7280' }}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>{low}</Text>
        <Text style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>{high}</Text>
      </View>
    </View>
  )
}

// ── WeeksView ──────────────────────────────────────────────────────
function WeeksView({ plan, selectedWeek, setSelectedWeek, refetch, isRefetching }: {
  plan: any; selectedWeek: number | null; setSelectedWeek: (n: number) => void
  refetch: () => void; isRefetching: boolean
}) {
  const today = new Date().getDay()
  const currentWeekNum = selectedWeek ?? plan.currentWeek
  const week = plan.weeks.find((w: any) => w.weekNumber === currentWeekNum) ?? plan.weeks[0]
  const sortedSessions = [...(week?.sessions ?? [])].sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek)
  const isCurrentWeek = currentWeekNum === plan.currentWeek
  const completedInWeek = sortedSessions.filter((s: any) => s.completed && s.type !== 'DESCANSO').length
  const totalInWeek = sortedSessions.filter((s: any) => s.type !== 'DESCANSO').length
  const progressPct = totalInWeek > 0 ? completedInWeek / totalInWeek : 0

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 32, gap: 12, paddingTop: 12 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
    >
      {/* Week selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 }}>
        {plan.weeks.map((w: any) => {
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
                ...SHADOW,
                shadowOpacity: active ? 0.15 : 0.04,
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
        <View style={{ marginHorizontal: 16, backgroundColor: 'white', borderRadius: 16, padding: 16, ...SHADOW }}>
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
              {completedInWeek}
              <Text style={{ fontSize: 14, color: '#9ca3af', fontFamily: 'Inter_500Medium' }}>/{totalInWeek}</Text>
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 6, width: `${progressPct * 100}%`, backgroundColor: '#f97316', borderRadius: 3 }} />
          </View>
        </View>
      )}

      {/* Sessions */}
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280',
          textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
          Sesiones
        </Text>
        {sortedSessions.map((session: any) => (
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

// ── ProgressView ───────────────────────────────────────────────────
function ProgressView() {
  const { data, isLoading } = useQuery({ queryKey: ['progress'], queryFn: getProgress })

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  const hasData = (data?.weightPoints.length ?? 0) > 0 || (data?.hrPoints.length ?? 0) > 0

  if (!hasData) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>📈</Text>
        <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1e3a5f', textAlign: 'center' }}>
          Aún no hay datos
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6b7280',
          textAlign: 'center', marginTop: 8, maxWidth: 240 }}>
          Haz tu primer check-in para ver tu evolución aquí.
        </Text>
      </View>
    )
  }

  const weightData = data!.weightPoints.map(p => ({ label: `S${p.week}`, value: p.kg }))
  const hrData = data!.hrPoints.map(p => ({ label: `S${p.week}`, value: p.bpm }))
  const lastWeight = data!.weightPoints.at(-1)?.kg ?? null
  const firstWeight = data!.weightPoints[0]?.kg ?? null
  const lastHr = data!.hrPoints.at(-1)?.bpm ?? null
  const weightDiff = lastWeight !== null && firstWeight !== null
    ? +(lastWeight - firstWeight).toFixed(1) : null

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
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
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>
            PESO
          </Text>
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
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>
            FC REPOSO
          </Text>
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
            {data!.weeks.map((w: any, i: number) => {
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {Object.entries(PHASE_COLOR).map(([phase, color]) => (
              <View key={phase} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>
                  {phase.charAt(0) + phase.slice(1).toLowerCase()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}

// ── CheckinView ────────────────────────────────────────────────────
function CheckinView() {
  const queryClient = useQueryClient()
  const [weight, setWeight] = useState('')
  const [sleep, setSleep] = useState('')
  const [energy, setEnergy] = useState(0)
  const [soreness, setSoreness] = useState(0)
  const [stress, setStress] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (energy === 0 || soreness === 0 || stress === 0) {
      Alert.alert('Faltan datos', 'Completa los tres indicadores antes de enviar.')
      return
    }
    setLoading(true)
    try {
      await submitCheckin({
        energyLevel: energy,
        muscleSoreness: soreness,
        stressLevel: stress,
        weightKg: weight ? parseFloat(weight) : undefined,
        sleepHours: sleep ? parseFloat(sleep) : undefined,
        notes: notes.trim() || undefined,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      setDone(true)
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar el check-in.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 56 }}>✅</Text>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1e3a5f', textAlign: 'center' }}>
          Check-in registrado
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>
          Tu plan se ajustará automáticamente esta semana.
        </Text>
        <TouchableOpacity
          onPress={() => {
            setWeight(''); setSleep(''); setEnergy(0); setSoreness(0); setStress(0); setNotes(''); setDone(false)
          }}
          style={{ marginTop: 8, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Nuevo check-in</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Métricas físicas */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Métricas opcionales
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Peso (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="72.5"
                placeholderTextColor="#d1d5db"
                keyboardType="decimal-pad"
                inputMode="decimal"
                style={{ backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14,
                  paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular',
                  color: '#111827', borderWidth: 1, borderColor: '#e5e7eb' }}
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Sueño (h)</Text>
              <TextInput
                value={sleep}
                onChangeText={setSleep}
                placeholder="7.5"
                placeholderTextColor="#d1d5db"
                keyboardType="decimal-pad"
                inputMode="decimal"
                style={{ backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14,
                  paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular',
                  color: '#111827', borderWidth: 1, borderColor: '#e5e7eb' }}
              />
            </View>
          </View>
        </View>

        {/* Escalas */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 20, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Cómo te sientes
          </Text>
          <ScaleSelector label="Energía general" value={energy} onChange={setEnergy} low="Agotado" high="Excelente" color="#f97316" />
          <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />
          <ScaleSelector label="Dolor muscular" value={soreness} onChange={setSoreness} low="Sin dolor" high="Muy fuerte" color="#ef4444" />
          <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />
          <ScaleSelector label="Estrés / carga mental" value={stress} onChange={setStress} low="Tranquilo" high="Muy estresado" color="#8b5cf6" />
        </View>

        {/* Notas */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Notas (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Lesión leve, semana pesada en trabajo, dormí mal..."
            placeholderTextColor="#d1d5db"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
              fontSize: 14, fontFamily: 'Inter_400Regular', color: '#111827',
              borderWidth: 1, borderColor: '#e5e7eb', minHeight: 80 }}
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
          style={{ backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 18,
            alignItems: 'center', opacity: loading ? 0.7 : 1 }}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Enviar check-in</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ── PlanScreen ─────────────────────────────────────────────────────
export default function PlanScreen() {
  const { user } = useAuthStore()
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<PlanTab>('weeks')
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

  const { data: plan, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['plan'],
    queryFn: getPlan,
  })

  if (!user?.features?.plan) {
    return <UpgradeWall icon="📅" title="Mi Plan" description="Accede a tu plan periodizado, progreso y check-in semanal con el plan Pro." />
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

  const TABS: { key: PlanTab; label: string }[] = [
    { key: 'weeks',    label: 'Plan' },
    { key: 'progress', label: 'Progreso' },
    { key: 'checkin',  label: 'Check-in' },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Gradient Header + Tab switcher */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 16, paddingHorizontal: 20 }}
      >
        <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>
          Mi Plan
        </Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
          {plan.name} · {plan.totalWeeks} semanas
        </Text>

        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 3, marginTop: 16 }}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                backgroundColor: activeTab === tab.key ? 'white' : 'transparent',
              }}
            >
              <Text style={{
                fontSize: 13, fontFamily: 'Inter_600SemiBold',
                color: activeTab === tab.key ? '#1e3a5f' : 'rgba(255,255,255,0.65)',
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Content */}
      {activeTab === 'weeks' && (
        <WeeksView
          plan={plan}
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeek}
          refetch={refetch}
          isRefetching={isRefetching}
        />
      )}
      {activeTab === 'progress' && <ProgressView />}
      {activeTab === 'checkin' && <CheckinView />}
    </View>
  )
}
