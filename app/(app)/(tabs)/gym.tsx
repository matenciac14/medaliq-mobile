import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { getTodayGymSession, getGymWeek, getPublicTemplates, assignTemplate, type PublicTemplate, type GymDayDetail, type GymWeekDetail, type RunningSession } from '../../../src/api/gym'
import { useAuthStore } from '../../../src/store/auth'
import { useGymSessionStore } from '../../../src/store/gymSession'
import UpgradeWall from '../../../src/components/UpgradeWall'

const DOW_LABELS = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const HARD_SESSIONS = new Set(['TEMPO', 'INTERVALOS', 'TIRADA_LARGA', 'FARTLEK', 'TEST', 'SIMULACRO'])

function formatWeekRange(mondayIso: string): string {
  const monday = new Date(mondayIso)
  const sun = new Date(monday)
  sun.setDate(monday.getDate() + 6)
  if (monday.getMonth() === sun.getMonth()) {
    return `${monday.getDate()}–${sun.getDate()} ${MONTHS[monday.getMonth()]}`
  }
  return `${monday.getDate()} ${MONTHS[monday.getMonth()]} – ${sun.getDate()} ${MONTHS[sun.getMonth()]}`
}

// ── Week Navigation Bar ──────────────────────────────────────────
function WeekNavBar({ weekLabel, weekOffset, onNavigate }: {
  weekLabel: string
  weekOffset: number
  onNavigate: (delta: number) => void
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {weekOffset !== 0 && (
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onNavigate(-weekOffset) }}
          style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fff7ed' }}
        >
          <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#f97316' }}>Hoy</Text>
        </TouchableOpacity>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onNavigate(-1) }}
          style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 16, color: '#6b7280' }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ paddingHorizontal: 10, fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>
          {weekLabel}
        </Text>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onNavigate(1) }}
          style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 16, color: '#6b7280' }}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Calendar Strip ───────────────────────────────────────────────
function GymCalendarStrip({ days, isCurrentWeek, selectedDow, onSelectDow }: {
  days: GymDayDetail[]
  isCurrentWeek: boolean
  selectedDow: number
  onSelectDow: (dow: number) => void
}) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
      {/* Progress bar */}
      {(() => {
        const total = days.filter(d => !d.isRest).length
        const done = days.filter(d => d.isCompleted && !d.isRest).length
        return (
          <View style={{ height: 3, backgroundColor: '#f3f4f6' }}>
            <View style={{ height: 3, backgroundColor: '#22c55e', width: total > 0 ? `${(done / total) * 100}%` as any : '0%' }} />
          </View>
        )
      })()}
      <View style={{ flexDirection: 'row' }}>
        {days.map((d) => {
          const isSelected = selectedDow === d.dow
          const bgColor = isSelected
            ? '#1e3a5f'
            : d.isCompleted && !d.isRest
            ? 'rgba(34,197,94,0.08)'
            : d.isToday
            ? '#fff7ed'
            : 'white'

          return (
            <TouchableOpacity
              key={d.dow}
              onPress={() => { Haptics.selectionAsync(); onSelectDow(isSelected ? 0 : d.dow) }}
              activeOpacity={0.7}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2, backgroundColor: bgColor, borderRightWidth: d.dow < 7 ? 1 : 0, borderRightColor: '#f3f4f6', position: 'relative' }}
            >
              {d.isToday && !isSelected && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#f97316' }} />
              )}
              <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', marginBottom: 2, color: isSelected ? 'rgba(255,255,255,0.7)' : d.isToday ? '#f97316' : '#9ca3af' }}>
                {DOW_LABELS[d.dow]}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 15, fontFamily: 'Inter_900Black', color: isSelected ? 'white' : d.isToday ? '#f97316' : d.isRest ? '#d1d5db' : d.isCompleted ? '#22c55e' : '#1f2937' }}>
                  {d.dateNum}
                </Text>
              </View>
              {d.isToday && !isSelected && (
                <View style={{ backgroundColor: '#f97316', borderRadius: 8, paddingHorizontal: 3, paddingVertical: 1, marginBottom: 2 }}>
                  <Text style={{ fontSize: 7, fontFamily: 'Inter_700Bold', color: 'white' }}>HOY</Text>
                </View>
              )}
              <Text style={{ fontSize: 13 }}>
                {d.isCompleted && !d.isRest
                  ? (isSelected ? '✓' : '✅')
                  : d.isRest
                  ? '😴'
                  : d.hasSession
                  ? '💪'
                  : '—'}
              </Text>
              <Text style={{ fontSize: 8, fontFamily: 'Inter_600SemiBold', color: isSelected ? 'rgba(255,255,255,0.8)' : d.isRest ? '#9ca3af' : '#6b7280', marginTop: 2, textAlign: 'center' }}>
                {d.isRest ? 'Desc.' : (d.muscleGroup?.slice(0, 4) ?? '—')}
              </Text>
              {d.hasSession && d.runningSession && HARD_SESSIONS.has(d.runningSession.type) && (
                <Text style={{ fontSize: 7, marginTop: 1 }}>⚡</Text>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ── Running session chip shown inside day detail ─────────────────
function RunningChip({ session }: { session: RunningSession }) {
  const isHard = HARD_SESSIONS.has(session.type)
  const bg = isHard ? '#fff7ed' : '#f0f9ff'
  const border = isHard ? '#fed7aa' : '#bae6fd'
  const color = isHard ? '#c2410c' : '#0369a1'
  const label = session.type.replace(/_/g, ' ')
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: bg, borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 14, marginBottom: 10 }}>
      <Text style={{ fontSize: 14 }}>{isHard ? '⚡' : '🏃'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {isHard ? 'Doble carga hoy' : 'Running + Gym hoy'}
        </Text>
        <Text style={{ fontSize: 11, color, fontFamily: 'Inter_500Medium', marginTop: 1 }}>
          {label}{session.durationMin ? ` · ${session.durationMin}min` : ''}{session.zoneTarget ? ` · ${session.zoneTarget}` : ''}
        </Text>
      </View>
    </View>
  )
}

// ── Day Detail Panel ─────────────────────────────────────────────
function DayDetailPanel({ detail, dayLabel, runningSession }: { detail: GymWeekDetail; dayLabel: string; runningSession?: RunningSession | null }) {
  if (detail.type === 'rest') {
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 24 }}>😴</Text>
        <View>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>{dayLabel} — Descanso</Text>
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Recuperación activa. Sin sesión planificada.</Text>
        </View>
      </View>
    )
  }

  if (detail.type === 'completed' && detail.session) {
    const s = detail.session
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>Sesión completada</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e3a5f', marginTop: 2 }}>{dayLabel}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
            {s.durationMin && (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>{s.durationMin}</Text>
                <Text style={{ fontSize: 9, color: '#9ca3af' }}>min</Text>
              </View>
            )}
            {s.rpe && (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#f97316' }}>{s.rpe}<Text style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>/10</Text></Text>
                <Text style={{ fontSize: 9, color: '#9ca3af' }}>RPE</Text>
              </View>
            )}
          </View>
        </View>
        {s.exercises.map((ex, i) => (
          <View key={i} style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: i < s.exercises.length - 1 ? 1 : 0, borderBottomColor: '#f9fafb' }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 6 }}>{ex.name}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ex.sets.map((set) => (
                <View key={set.setNumber} style={{ backgroundColor: set.completed ? '#f0fdf4' : '#f9fafb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: set.completed ? '#bbf7d0' : '#e5e7eb' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: set.completed ? '#16a34a' : '#9ca3af' }}>
                    {set.weightKg != null && set.repsCompleted != null
                      ? `${set.weightKg}kg × ${set.repsCompleted}`
                      : set.repsCompleted != null
                      ? `${set.repsCompleted} reps`
                      : `Serie ${set.setNumber}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        {s.notes && (
          <View style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f9fafb' }}>
            <Text style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>{s.notes}</Text>
          </View>
        )}
        {runningSession && <View style={{ paddingBottom: 2 }}><RunningChip session={runningSession} /></View>}
      </View>
    )
  }

  if (detail.type === 'planned' && detail.planned) {
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>Planificado</Text>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e3a5f', marginTop: 2 }}>{dayLabel}</Text>
        </View>
        {runningSession && <View style={{ paddingTop: 10 }}><RunningChip session={runningSession} /></View>}
        {detail.planned.exercises.map((ex, i) => (
          <View key={i} style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: i < detail.planned!.exercises.length - 1 ? 1 : 0, borderBottomColor: '#f9fafb' }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#1f2937', flex: 1 }}>{ex.name}</Text>
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>{ex.sets} × {ex.repsScheme}</Text>
          </View>
        ))}
      </View>
    )
  }

  return null
}

// ── "Esta Semana" section ────────────────────────────────────────
function ThisWeekSection({ todayDow, isCurrentWeek: _isCurrentWeek }: { todayDow: number; isCurrentWeek: boolean }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDow, setSelectedDow] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['gym-week', weekOffset, selectedDow],
    queryFn: () => getGymWeek(weekOffset, selectedDow || undefined),
  })

  function handleNavigate(delta: number) {
    setWeekOffset(prev => prev + delta)
    setSelectedDow(0)
  }

  if (isLoading || !data) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <ActivityIndicator color="#f97316" size="small" />
      </View>
    )
  }

  const weekLabel = formatWeekRange(data.mondayDate)
  const selectedDay = data.days.find(d => d.dow === selectedDow)
  const dayLabel = selectedDay
    ? `${DOW_LABELS[selectedDay.dow]} ${selectedDay.dateNum} · ${selectedDay.label ?? (selectedDay.isRest ? 'Descanso' : 'Sin sesión')}`
    : ''

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>Esta semana</Text>
          <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
            {weekLabel} · {data.completedCount}/{data.trainingDays} sesiones
          </Text>
        </View>
        <WeekNavBar weekLabel={weekLabel} weekOffset={weekOffset} onNavigate={handleNavigate} />
      </View>

      <GymCalendarStrip
        days={data.days}
        isCurrentWeek={data.isCurrentWeek}
        selectedDow={selectedDow}
        onSelectDow={setSelectedDow}
      />

      {selectedDow >= 1 && data.selectedDetail && (
        <DayDetailPanel
          detail={data.selectedDetail}
          dayLabel={dayLabel}
          runningSession={selectedDay?.runningSession}
        />
      )}
    </View>
  )
}

const CATEGORY_ICONS: Record<string, string> = {
  PPL: '🔄', FULL_BODY: '💪', UPPER_LOWER: '↕️', STRENGTH: '🏋️', BEGINNER: '🌱',
}
const GOAL_LABELS: Record<string, string> = {
  HYPERTROPHY: 'Hipertrofia', STRENGTH: 'Fuerza', TONING: 'Tonificación', FUNCTIONAL: 'Funcional',
}
const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  BEGINNER:     { bg: '#dcfce7', text: '#15803d' },
  INTERMEDIATE: { bg: '#fef9c3', text: '#a16207' },
  ADVANCED:     { bg: '#fee2e2', text: '#b91c1c' },
}
const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Principiante', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado',
}

function TemplateCard({ tmpl, onSelect, selecting }: {
  tmpl: PublicTemplate
  onSelect: (id: string) => void
  selecting: string | null
}) {
  const isLoading = selecting === tmpl.id
  const level = LEVEL_COLORS[tmpl.level ?? ''] ?? { bg: '#f3f4f6', text: '#6b7280' }

  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
      {/* Header */}
      <LinearGradient colors={['#1e3a5f', '#2d5a8e']} style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 22 }}>{CATEGORY_ICONS[tmpl.category ?? ''] ?? '💪'}</Text>
          <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold', lineHeight: 22 }}>{tmpl.name}</Text>
        </View>
        {tmpl.level && (
          <View style={{ backgroundColor: level.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: level.text }}>{LEVEL_LABELS[tmpl.level] ?? tmpl.level}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Body */}
      <View style={{ backgroundColor: 'white', padding: 16, gap: 12 }}>
        {tmpl.description && (
          <Text style={{ fontSize: 13, color: '#4b5563', fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
            {tmpl.description}
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {tmpl.goal && (
            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11 }}>🎯</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#374151' }}>
                {GOAL_LABELS[tmpl.goal] ?? tmpl.goal}
              </Text>
            </View>
          )}
          <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11 }}>📅</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#374151' }}>
              {tmpl.trainingDays} días/semana
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            onSelect(tmpl.id)
          }}
          disabled={!!selecting}
          activeOpacity={0.85}
          style={{ backgroundColor: selecting ? '#e5e7eb' : '#f97316', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={{ color: selecting ? '#9ca3af' : 'white', fontSize: 14, fontFamily: 'Inter_700Bold' }}>
              Elegir esta rutina →
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

function TemplatePickerScreen({ insets }: { insets: { top: number; bottom: number } }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selecting, setSelecting] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['gym-templates'],
    queryFn: getPublicTemplates,
  })

  const { mutate: assign } = useMutation({
    mutationFn: assignTemplate,
    onMutate: (id) => setSelecting(id),
    onSuccess: () => {
      setDone(true)
      setSelecting(null)
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['gym-today'] }), 800)
    },
    onError: () => setSelecting(null),
  })

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  if (done) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', gap: 12 }}>
        <Text style={{ fontSize: 56 }}>✅</Text>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>Rutina asignada</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', fontFamily: 'Inter_400Regular' }}>Cargando tu sesión...</Text>
        <ActivityIndicator color="#f97316" style={{ marginTop: 8 }} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 20, gap: 4 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>Gym</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' }}>
              Elige tu rutina y empieza hoy
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/exercises')}
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginTop: 4 }}
          >
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'white' }}>Ejercicios →</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {(templates ?? []).map(tmpl => (
          <TemplateCard key={tmpl.id} tmpl={tmpl} onSelect={(id) => assign(id)} selecting={selecting} />
        ))}

        {/* Coach tip */}
        <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 18 }}>👨‍💼</Text>
          <Text style={{ flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', color: '#1d4ed8', lineHeight: 18 }}>
            ¿Tienes un coach? Tu coach puede asignarte una rutina personalizada que reemplazará esta plantilla.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

export default function GymScreen() {
  const { user } = useAuthStore()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { lastSession, clearLastSession } = useGymSessionStore()

  const todayDow = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d })()

  const { data: session, isLoading, isError, refetch } = useQuery({
    queryKey: ['gym-today'],
    queryFn: getTodayGymSession,
    retry: false,
  })

  if (!user?.features?.gym) {
    return <UpgradeWall icon="🏋️" title="Gym tracker" description="Registra tus sesiones de gym, sigue la progresión de cargas y accede a rutinas con el plan Pro." />
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  // Sin rutina asignada (404) → mostrar selector de plantillas públicas
  if (isError) {
    return <TemplatePickerScreen insets={insets} />
  }

  // Rutina asignada pero hoy es descanso (isRestDay o sin workoutDay)
  if (!session || session.isRestDay || !session.workoutDay) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>😴</Text>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1e3a5f', textAlign: 'center' }}>
          Descanso hoy
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8 }}>
          No hay sesión de gym programada para hoy.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
      contentContainerStyle={{ paddingBottom: 32, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Gradient Header */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>
              Gym
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', marginTop: 4 }}>
              {session.workoutDay.label}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/exercises')}
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginTop: 4 }}
          >
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'white' }}>Ejercicios →</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Post-session summary banner */}
      {lastSession && (
        <View style={{ marginHorizontal: 16, backgroundColor: '#f0fdf4', borderRadius: 14, borderWidth: 1, borderColor: '#bbf7d0', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 28 }}>✅</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#15803d' }}>Sesión completada</Text>
            <Text style={{ fontSize: 12, color: '#16a34a', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
              {lastSession.durationMin} min
              {lastSession.prCount > 0 ? ` · ${lastSession.prCount} PR${lastSession.prCount > 1 ? 's' : ''} nuevo${lastSession.prCount > 1 ? 's' : ''}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={clearLastSession} style={{ padding: 4 }}>
            <Text style={{ fontSize: 18, color: '#86efac' }}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Running session planned today banner (GYM-MOB-02) */}
      {session?.plannedRunToday && (
        <View style={{ marginHorizontal: 16, backgroundColor: '#f0f7ff', borderRadius: 14, borderWidth: 1, borderColor: '#bfdbfe', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 22 }}>🏃</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#1d4ed8' }}>
              {['INTERVALOS', 'TIRADA_LARGA', 'SIMULACRO', 'TEST', 'TEMPO', 'FARTLEK'].includes(session.plannedRunToday.type) ? 'Doble carga hoy' : 'Running + Gym hoy'}
            </Text>
            <Text style={{ fontSize: 12, color: '#2563eb', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
              {session.plannedRunToday.type.replace(/_/g, ' ')}
              {session.plannedRunToday.durationMin ? ` · ${session.plannedRunToday.durationMin} min` : ''}
              {session.plannedRunToday.zoneTarget ? ` · ${session.plannedRunToday.zoneTarget}` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Start session card */}
      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            router.push('/(app)/gym-session')
          }}
          activeOpacity={0.85}
          style={{ backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
            shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>
            Comenzar sesión · {session.exercises.length} ejercicios
          </Text>
        </TouchableOpacity>
      </View>

      {/* Muscle group pills */}
      {session.workoutDay.muscleGroups.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16 }}>
          {session.workoutDay.muscleGroups.map((mg) => (
            <View key={mg} style={{ backgroundColor: 'rgba(30,58,95,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ color: '#1e3a5f', fontSize: 12, fontFamily: 'Inter_500Medium' }}>{mg}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Ejercicios preview */}
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
          Ejercicios
        </Text>
        {session.exercises.map((ex, i) => {
          const prev = ex.previousLogs.find((l) => l.setNumber === 1)
          return (
            <View key={ex.id} style={{ backgroundColor: 'white', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
              <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{ex.exercise.name}</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                  {ex.sets} series · {ex.repsScheme}
                  {prev?.weightKg ? ` · prev: ${prev.weightKg}kg` : ''}
                </Text>
              </View>
            </View>
          )
        })}
      </View>

      {/* Esta semana */}
      {!isError && (
        <View style={{ paddingHorizontal: 16 }}>
          <ThisWeekSection todayDow={todayDow} isCurrentWeek={true} />
        </View>
      )}

      {/* Historial link */}
      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity
          onPress={() => router.push('/(app)/gym-history')}
          activeOpacity={0.7}
          style={{ backgroundColor: 'white', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 18 }}>📋</Text>
            <View>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>Historial de sesiones</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 2 }}>Ver todas mis sesiones</Text>
            </View>
          </View>
          <Text style={{ fontSize: 20, color: '#9ca3af' }}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
