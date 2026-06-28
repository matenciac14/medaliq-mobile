import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { getDashboard, getWeekSessions, type WeekSession } from '../../../src/api/dashboard'
import { useAuthStore } from '../../../src/store/auth'

const SESSION_ICONS: Record<string, string> = {
  RODAJE_Z2: '🏃', FARTLEK: '🏃', TIRADA_LARGA: '🏃', TEMPO: '🏃', INTERVALOS: '🏃',
  CICLA: '🚴', NATACION: '🏊', FUERZA: '💪', DESCANSO: '😴', OTRO: '🏅',
}

// Código corto para celdas de 28×28px en WeeklyStrip — NO cambiar a palabras largas
const SESSION_SHORT: Record<string, string> = {
  RODAJE_Z2: 'Z2', FARTLEK: 'FK', TIRADA_LARGA: 'TL', TEMPO: 'TMP', INTERVALOS: 'INT',
  CICLA: 'CIC', NATACION: 'NAT', FUERZA: 'FZA', DESCANSO: '·', OTRO: '?',
}

// Nombre legible para listas (actividad reciente, historial)
const SESSION_LABEL: Record<string, string> = {
  RODAJE_Z2: 'Correr Z2', FARTLEK: 'Fartlek', TIRADA_LARGA: 'Long run', TEMPO: 'Tempo', INTERVALOS: 'Intervalos',
  CICLA: 'Ciclismo', NATACION: 'Natación', FUERZA: 'Fuerza', DESCANSO: 'Descanso', OTRO: 'Actividad',
}

const SESSION_COLORS: Record<string, string> = {
  FUERZA: '#8b5cec',
  RODAJE_Z2: '#f97316',
  FARTLEK: '#f97316',
  TIRADA_LARGA: '#f97316',
  CICLA: '#3b82f6',
  NATACION: '#06b6d4',
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function getIntensityLabel(sessionType: string | null | undefined): string {
  if (!sessionType || sessionType === 'DESCANSO') return 'Día de descanso'
  if (['FARTLEK', 'TIRADA_LARGA'].includes(sessionType)) return 'Día intenso'
  if (['RODAJE_Z2', 'CICLA', 'NATACION', 'FUERZA'].includes(sessionType)) return 'Día moderado'
  return 'Día suave'
}

// ── Weekly Strip ──────────────────────────────────────────────────
function WeeklyStrip({ mainData, onLogSession }: {
  mainData: { weekSessions: WeekSession[]; completedCount: number; totalTraining: number; volumeDeltaPct: number | null }
  onLogSession: (s: WeekSession) => void
}) {
  const [weekOffset, setWeekOffset] = useState(0)
  const isCurrentWeek = weekOffset === 0

  const { data: weekData } = useQuery({
    queryKey: ['week-sessions', weekOffset],
    queryFn: () => getWeekSessions(weekOffset),
    enabled: weekOffset !== 0,
  })

  const sessions = isCurrentWeek ? mainData.weekSessions : (weekData?.weekSessions ?? mainData.weekSessions)
  const completed = isCurrentWeek ? mainData.completedCount : (weekData?.completedCount ?? 0)
  const total = isCurrentWeek ? mainData.totalTraining : (weekData?.totalTraining ?? 0)
  const weekLabel = isCurrentWeek ? 'Esta semana' : (weekData?.weekLabel ?? '...')
  const pct = total > 0 ? completed / total : 0

  const todayIdx = isCurrentWeek
    ? (sessions.find(s => s.isToday)?.dayIndex ?? -1)
    : -1

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 14, ...SHADOW }}>
      {/* Header row with nav */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {weekLabel}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {!isCurrentWeek && (
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setWeekOffset(0) }}
              style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: '#fff7ed' }}
            >
              <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#f97316' }}>Hoy</Text>
            </TouchableOpacity>
          )}
          {isCurrentWeek && mainData.volumeDeltaPct != null && (
            <View style={{ backgroundColor: mainData.volumeDeltaPct >= 0 ? '#f0fdf4' : '#fff1f2', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: mainData.volumeDeltaPct >= 0 ? '#16a34a' : '#dc2626' }}>
                {mainData.volumeDeltaPct >= 0 ? '+' : ''}{mainData.volumeDeltaPct}% vol
              </Text>
            </View>
          )}
          <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#f97316' }}>
            {completed}/{total} sesiones
          </Text>
          {/* Nav buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setWeekOffset((w: number) => w - 1) }}
              style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 18 }}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setWeekOffset((w: number) => w + 1) }}
              style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 18 }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
        <View style={{ height: 3, width: `${pct * 100}%` as any, backgroundColor: '#22c55e', borderRadius: 2 }} />
      </View>
      {/* Day cells */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {sessions.map((s) => {
          const isRest = !s.type || s.type === 'DESCANSO'
          const isFuture = isCurrentWeek && s.dayIndex > todayIdx
          const isPast = isCurrentWeek && s.dayIndex < todayIdx
          const canLog = isCurrentWeek && !isRest && !s.done && !isFuture && !!s.id
          const label = s.type ? (SESSION_SHORT[s.type] ?? '?') : '·'
          const labelColor = s.isToday ? 'white' : (SESSION_COLORS[s.type ?? ''] ?? '#6b7280')

          const cell = (
            <View style={{
              width: 28, height: 28, borderRadius: isRest ? 14 : 8, alignItems: 'center', justifyContent: 'center',
              backgroundColor: s.isToday
                ? '#1e3a5f'
                : s.done && !isRest ? '#dcfce7'
                : isFuture && !isRest ? '#f8fafc'
                : isRest ? 'transparent'
                : isPast && !s.done && !isRest ? '#fff7ed'
                : '#f1f5f9',
              borderWidth: canLog && isPast ? 1 : 0,
              borderColor: '#f97316',
              opacity: isFuture && !isRest ? 0.35 : 1,
            }}>
              {s.done && !isRest ? (
                <Text style={{ fontSize: 12, color: '#22c55e', fontFamily: 'Inter_700Bold' }}>✓</Text>
              ) : isPast && !s.done && !isRest ? (
                <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#f97316' }}>!</Text>
              ) : (
                <Text style={{ fontSize: isRest ? 14 : 9, fontFamily: 'Inter_700Bold', color: isRest ? '#d1d5db' : isFuture ? '#9ca3af' : labelColor }}>
                  {isRest ? '·' : label}
                </Text>
              )}
            </View>
          )

          return (
            <View key={s.dayIndex} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
              <Text style={{ fontSize: 10, fontFamily: s.isToday ? 'Inter_700Bold' : 'Inter_400Regular', color: s.isToday ? '#1e3a5f' : '#9ca3af' }}>
                {DAY_LABELS[s.dayIndex]}
              </Text>
              {canLog ? (
                <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onLogSession(s) }} activeOpacity={0.7}>
                  {cell}
                </TouchableOpacity>
              ) : cell}
            </View>
          )
        })}
      </View>
      {isCurrentWeek && sessions.some(s => !s.done && s.dayIndex < todayIdx && s.type && s.type !== 'DESCANSO') && (
        <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#f97316', marginTop: 8, textAlign: 'center' }}>
          Toca ! para registrar sesiones pasadas
        </Text>
      )}
    </View>
  )
}

// ── Hero Cards ────────────────────────────────────────────────────
const FORM_COLORS = {
  good:     { bg: '#f0fdf4', border: '#22c55e', label: '#166534', text: '#14532d', chip: '#bbf7d0', chipText: '#14532d' },
  moderate: { bg: '#fffbeb', border: '#f59e0b', label: '#92400e', text: '#78350f', chip: '#fde68a', chipText: '#78350f' },
  rest:     { bg: '#fef2f2', border: '#ef4444', label: '#991b1b', text: '#7f1d1d', chip: '#fecaca', chipText: '#7f1d1d' },
}

function HeroForma({ formStatus, formMessage, lastCheckIn, hrResting }: {
  formStatus: 'good' | 'moderate' | 'rest'
  formMessage: string
  lastCheckIn: { energyLevel: number | null; hardestSessionRpe: number | null; sleepHours: number | null } | null
  hrResting: number | null
}) {
  const c = FORM_COLORS[formStatus]
  const icon = formStatus === 'good' ? '⚡' : formStatus === 'moderate' ? '⚠️' : '😴'
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: c.border }} />
      <View style={{ padding: 14 }}>
        <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: c.label, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
          {icon}  CÓMO LLEGÁS HOY
        </Text>
        <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: c.text, marginBottom: 10 }}>
          {formMessage}
        </Text>
        {lastCheckIn && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {lastCheckIn.energyLevel != null && (
              <View style={{ backgroundColor: c.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: c.chipText }}>
                  Energía {lastCheckIn.energyLevel}/10
                </Text>
              </View>
            )}
            {lastCheckIn.hardestSessionRpe != null && (
              <View style={{ backgroundColor: c.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: c.chipText }}>
                  RPE {lastCheckIn.hardestSessionRpe}/10
                </Text>
              </View>
            )}
            {lastCheckIn.sleepHours != null && (
              <View style={{ backgroundColor: c.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: c.chipText }}>
                  Sueño {lastCheckIn.sleepHours >= 6.5 ? '✓' : `${lastCheckIn.sleepHours}h`}
                </Text>
              </View>
            )}
            {hrResting != null && (
              <View style={{ backgroundColor: c.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: c.chipText }}>
                  FC basal {hrResting} bpm
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

function HeroCarrera({ raceDays, isRecomp, planData, metrics }: {
  raceDays: number | null
  isRecomp: boolean
  planData: { currentWeek: number; totalWeeks: number } | null
  metrics: { weightKg: number | null; weightGoalKg: number | null }
}) {
  const progressPct = planData ? Math.round(((planData.currentWeek - 1) / planData.totalWeeks) * 100) : 0
  if (isRecomp) {
    const kg = metrics.weightKg; const goal = metrics.weightGoalKg
    const diff = kg && goal ? Math.abs(kg - goal) : null
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
        <View style={{ height: 3, backgroundColor: '#f97316' }} />
        <View style={{ padding: 14, flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
              🎯  TU OBJETIVO
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ fontSize: 34, fontFamily: 'Inter_900Black', color: '#f97316', letterSpacing: -1 }}>
                {diff != null ? diff.toFixed(1) : '—'}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>kg restantes</Text>
            </View>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 4 }}>
              {kg ? `${kg} kg actual` : ''}{goal ? `  →  ${goal} kg meta` : ''}
            </Text>
          </View>
          {planData && (
            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 80 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>Semana</Text>
              <Text style={{ fontSize: 15, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>{planData.currentWeek} / {planData.totalWeeks}</Text>
              <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, width: 60, marginTop: 6 }}>
                <View style={{ height: 4, backgroundColor: '#f97316', borderRadius: 2, width: `${progressPct}%` as any }} />
              </View>
            </View>
          )}
        </View>
      </View>
    )
  }
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#f97316' }} />
      <View style={{ padding: 14, flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
            🏁  TU CARRERA
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontSize: 34, fontFamily: 'Inter_900Black', color: '#f97316', letterSpacing: -1 }}>
              {raceDays != null && raceDays > 0 ? raceDays : '—'}
            </Text>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>días</Text>
          </View>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 4 }}>
            {raceDays != null && raceDays > 0 ? 'para tu próxima carrera' : 'sin fecha de carrera'}
          </Text>
        </View>
        {planData && (
          <View style={{ backgroundColor: '#f1f5f9', borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 80 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>Semana</Text>
            <Text style={{ fontSize: 15, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>{planData.currentWeek} / {planData.totalWeeks}</Text>
            <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, width: 60, marginTop: 6 }}>
              <View style={{ height: 4, backgroundColor: '#f97316', borderRadius: 2, width: `${progressPct}%` as any }} />
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

function HeroPeso({ metrics, weeklyWeightChange, weightProgressPct }: {
  metrics: { weightKg: number | null; weightGoalKg: number | null }
  weeklyWeightChange: number | null
  weightProgressPct: number | null
}) {
  const losing = (metrics.weightKg ?? 0) > (metrics.weightGoalKg ?? 0)
  const changeColor = weeklyWeightChange == null ? '#9ca3af'
    : losing ? (weeklyWeightChange < 0 ? '#22c55e' : '#ef4444')
    : (weeklyWeightChange > 0 ? '#22c55e' : '#ef4444')
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#3b82f6' }} />
      <View style={{ padding: 14, flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
            ⚖️  META DE PESO
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={{ fontSize: 30, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
              {metrics.weightKg ?? '—'}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>kg</Text>
            {metrics.weightGoalKg && (
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#22c55e' }}>
                → {metrics.weightGoalKg} kg
              </Text>
            )}
          </View>
          {weeklyWeightChange != null && (
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: changeColor, marginTop: 4 }}>
              {weeklyWeightChange > 0 ? '+' : ''}{weeklyWeightChange} kg esta semana
            </Text>
          )}
        </View>
        {weightProgressPct != null && (
          <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 72 }}>
            <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#22c55e', letterSpacing: -0.5 }}>
              {weightProgressPct}%
            </Text>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>
              del objetivo
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ── AI Coach Teaser — desactivado, preservado para nueva UX proactiva ────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AICoachTeaser({ message, onPress }: { message: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
      <LinearGradient
        colors={['#1e3a5f', '#2e5c99']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}
      >
        {/* Decorative circles */}
        <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.04)', right: 60, top: -15 }} />
        <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.04)', right: 38, top: -15 }} />
        <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.04)', right: 16, top: -15 }} />
        <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.04)', right: -6, top: -15 }} />

        <Text style={{ fontSize: 22 }}>🤖</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'white', marginBottom: 3 }}>
            Medaliq
          </Text>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', lineHeight: 16 }}>
            {message}
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>→</Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}

export default function DashboardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })

  // Refrescar al volver al tab (tabs no se desmontan, refetchOnMount no dispara)
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1e3a5f', textAlign: 'center' }}>
          No se pudo cargar
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', marginTop: 6, marginBottom: 20 }}>
          Revisa tu conexión e intenta de nuevo.
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{ backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ color: 'white', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const d = data
  const firstName = d.firstName || (user?.name ?? 'Atleta').split(' ')[0]

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
      contentContainerStyle={{ paddingBottom: 28, gap: 12 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Gradient Header ───────────────────────────────────── */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 22, paddingHorizontal: 20, gap: 12 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 22, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.3 }}
          >
            {getGreeting()}, {firstName}
          </Text>
          {d.trialDaysLeft !== null && d.trialDaysLeft > 0 && (
            <View style={{ backgroundColor: '#fef9c3', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#92400e' }}>
                {d.trialDaysLeft}d trial
              </Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {d.planData && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
                Semana {d.planData.currentWeek}/{d.planData.totalWeeks}  ·  {d.planData.phase}
              </Text>
            </View>
          )}
          {d.streakDays > 0 && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
                🔥 {d.streakDays} días · racha
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>

        {/* ── Sesión de hoy ─────────────────────────────────── */}
        {d.todaySession ? (
          <View style={{ borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
            <LinearGradient
              colors={['#1e3a5f', '#2d5a8e']}
              style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 8 }}
            >
              {/* HOY label + Zona pill en la misma fila */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.55)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  HOY
                </Text>
                <View style={{ backgroundColor: 'rgba(34,197,94,0.28)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#86efac' }}>
                    ● Zona {d.todaySession.zoneTarget}
                  </Text>
                </View>
              </View>
              {/* Emoji + duración */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 34 }}>{SESSION_ICONS[d.todaySession.type] ?? '🏅'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>
                    {d.todaySession.durationMin} min
                  </Text>
                </View>
                {d.todaySession.completed && (
                  <View style={{ backgroundColor: '#22c55e', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: 'white', fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>✓ Hecha</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular' }}>
                {d.todaySession.type.toLowerCase().replace(/_/g, ' ')}
              </Text>
            </LinearGradient>
            {!d.todaySession.completed && (
              <View style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                    if (d.todaySession!.id === 'gym-today') {
                      router.push('/(app)/(tabs)/gym')
                    } else {
                      router.push({
                        pathname: '/(app)/log',
                        params: {
                          sessionId: d.todaySession!.id,
                          type: d.todaySession!.type,
                          duration: String(d.todaySession!.durationMin),
                          zone: d.todaySession!.zoneTarget,
                        },
                      })
                    }
                  }}
                  activeOpacity={0.85}
                  style={{ backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>
                    {d.todaySession!.id === 'gym-today' ? 'Ir al Gym →' : 'Registrar sesión'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : d.mode === 'FREE' ? (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(app)/log', params: {} })}
            activeOpacity={0.85}
            style={{ backgroundColor: '#1e3a5f', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOW }}
          >
            <Text style={{ fontSize: 28 }}>➕</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: 'white' }}>Registrar actividad</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_400Regular', marginTop: 2 }}>Sin plan activo — registra libremente</Text>
            </View>
            <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>→</Text>
          </TouchableOpacity>
        ) : d.mode === 'RECOVERY' ? (
          <View style={{ borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
            <View style={{ height: 3, backgroundColor: '#22c55e' }} />
            <View style={{ backgroundColor: '#f0fdf4', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Text style={{ fontSize: 32 }}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#16a34a', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                  Plan completado
                </Text>
                <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#14532d' }}>
                  {d.completedPlanName ?? 'Plan terminado'}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#4ade80', marginTop: 3 }}>
                  {d.recoveryDaysLeft != null && d.recoveryDaysLeft > 0
                    ? `Recuperación activa · ${d.recoveryDaysLeft} días restantes`
                    : 'Listo para un nuevo plan'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOW }}>
            <Text style={{ fontSize: 28 }}>😴</Text>
            <View>
              <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>Día de descanso</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>Recupera bien hoy</Text>
            </View>
          </View>
        )}

        {/* ── Weekly Strip ──────────────────────────────────── */}
        {d.weekSessions.length > 0 && (
          <WeeklyStrip
            mainData={{ weekSessions: d.weekSessions, completedCount: d.completedCount, totalTraining: d.totalTraining, volumeDeltaPct: d.volumeDeltaPct }}
            onLogSession={(s) => {
              router.push({
                pathname: '/(app)/log',
                params: {
                  sessionId: s.id!,
                  type: s.type!,
                  duration: String(s.durationMin ?? ''),
                  zone: s.zoneTarget ?? '2',
                },
              })
            }}
          />
        )}

        {/* ── Actividad reciente (modo FREE) ────────────────── */}
        {d.mode === 'FREE' && (d.recentActivity?.length ?? 0) > 0 && (
          <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
            <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Actividad reciente
              </Text>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#f97316' }}>🔥 {d.streakDays > 0 ? `${d.streakDays} días de racha` : ''}</Text>
            </View>
            {(d.recentActivity ?? []).map((a, i) => (
              <View
                key={i}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#f3f4f6' }}
              >
                <Text style={{ fontSize: 22 }}>{SESSION_ICONS[a.type] ?? '🏅'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                    {SESSION_LABEL[a.type] ?? a.type.toLowerCase().replace(/_/g, ' ')}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 1 }}>
                    {new Date(a.completedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {a.durationMin ? `  ·  ${a.durationMin} min` : ''}
                  </Text>
                </View>
                {a.rpe != null && (
                  <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>RPE {a.rpe}</Text>
                  </View>
                )}
              </View>
            ))}
            <View style={{ paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 }}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(app)/log', params: {} })}
                activeOpacity={0.85}
                style={{ backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>+ Registrar actividad</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Check-in pendiente ────────────────────────────── */}
        {d.checkinPending && (
          <TouchableOpacity
            onPress={() => router.push('/(app)/(tabs)/checkin')}
            activeOpacity={0.85}
            style={{ backgroundColor: '#fff7ed', borderRadius: 14, overflow: 'hidden', flexDirection: 'row', ...SHADOW }}
          >
            <View style={{ width: 4, backgroundColor: '#f97316' }} />
            <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#9a3412' }}>
                Check-in semanal pendiente
              </Text>
              <Text style={{ fontSize: 10, color: '#c2410c', fontFamily: 'Inter_400Regular', marginTop: 3 }}>
                Registra métricas  ·  tu plan se ajusta automáticamente  →
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Tu Progreso ───────────────────────────────────── */}
        <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 }}>
          Tu Progreso
        </Text>

        {d.lastCheckIn && (
          <HeroForma
            formStatus={d.formStatus}
            formMessage={d.formMessage}
            lastCheckIn={d.lastCheckIn}
            hrResting={d.metrics.hrResting}
          />
        )}

        <HeroCarrera
          raceDays={d.raceDays}
          isRecomp={d.isRecomp}
          planData={d.planData}
          metrics={d.metrics}
        />

        <HeroPeso
          metrics={d.metrics}
          weeklyWeightChange={d.weeklyWeightChange}
          weightProgressPct={d.weightProgressPct}
        />

      </View>
    </ScrollView>
  )
}
