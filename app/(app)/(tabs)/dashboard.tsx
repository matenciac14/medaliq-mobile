import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { getDashboard, getWeekSessions, type WeekSession, type DashboardData } from '../../../src/api/dashboard'
import { apiFetch } from '../../../src/api/client'
import { getNotifications } from '../../../src/api/notifications'
import { useAuthStore } from '../../../src/store/auth'

import { SESSION_ICONS, SESSION_LABELS } from '../../../src/constants/sessions'
import CoachCard from '../../../src/components/dashboard/CoachCard'
import HeroCarga from '../../../src/components/dashboard/HeroCarga'
import NutritionBanner from '../../../src/components/dashboard/NutritionBanner'

const PHASE_DISPLAY: Record<string, string> = {
  BASE: 'BASE', DESARROLLO: 'DESARROLLO', ESPECIFICO: 'ESPECÍFICO', AFINAMIENTO: 'AFINAMIENTO',
}

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

const DOT_DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos dias'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate() {
  const d = new Date()
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
}

function getCurrentWeekLabel(): string {
  const now = new Date()
  const dow = now.getDay() === 0 ? 7 : now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (dow - 1))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => `${d.getDate()} ${d.toLocaleDateString('es', { month: 'short' }).replace('.', '')}`
  return `${fmt(mon)} – ${fmt(sun)}`
}

// -- Dot detail card (shared between DotWeekStrip and WeeklyStrip) ----------
function DotDetail({ session, onLog }: { session: WeekSession; onLog?: (s: WeekSession) => void }) {
  const hasSession = !!session.type && session.type !== 'DESCANSO'
  const isRest = session.type === 'DESCANSO'
  const label = hasSession ? (SESSION_LABELS[session.type!] ?? session.type!) : isRest ? 'Descanso' : 'Sin sesión'
  const emoji = hasSession ? (SESSION_ICONS[session.type!] ?? '🏅') : isRest ? '😴' : null

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
      {emoji && <Text style={{ fontSize: 18 }}>{emoji}</Text>}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
          {hasSession && session.durationMin != null && session.durationMin > 0 && (
            <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>{session.durationMin} min</Text>
            </View>
          )}
          {hasSession && session.zoneTarget && session.zoneTarget !== 'N/A' && session.type !== 'FUERZA' && (
            <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>Zona {session.zoneTarget}</Text>
            </View>
          )}
          {session.done && hasSession && (
            <View style={{ backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#16a34a' }}>✓ Completada</Text>
            </View>
          )}
        </View>
      </View>
      {hasSession && !session.done && onLog && session.id && (
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onLog(session) }}
          style={{ backgroundColor: '#ea580c', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: 'white' }}>Registrar</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// -- Figma-style dot week strip (FREE mode) --------------------------------
function DotWeekStrip({ sessions, weekOffset, setWeekOffset, completedCount, totalTraining }: {
  sessions: WeekSession[]
  weekOffset: number
  setWeekOffset: (fn: (w: number) => number) => void
  completedCount: number
  totalTraining: number
}) {
  const isCurrentWeek = weekOffset === 0
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  const { data: weekData } = useQuery({
    queryKey: ['week-sessions', weekOffset],
    queryFn: () => getWeekSessions(weekOffset),
    enabled: weekOffset !== 0,
  })

  const displaySessions = isCurrentWeek ? sessions : (weekData?.weekSessions ?? sessions)
  const weekLabel = isCurrentWeek ? getCurrentWeekLabel() : (weekData?.weekLabel ?? '...')
  const completed = isCurrentWeek ? completedCount : (weekData?.completedCount ?? 0)
  const total = isCurrentWeek ? totalTraining : (weekData?.totalTraining ?? 0)

  const selectedSession = selectedIdx !== null ? displaySessions.find(s => s.dayIndex === selectedIdx) ?? null : null

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 14, ...SHADOW }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          ESTA SEMANA
        </Text>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>
          {completed} registros
        </Text>
      </View>
      {/* Week nav — arrows at edges, label + "Hoy" centered */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setWeekOffset((w: number) => w - 1); setSelectedIdx(null) }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={18} color="#6b7280" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>
            {weekLabel}
          </Text>
          {!isCurrentWeek && (
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setWeekOffset(() => 0); setSelectedIdx(null) }}
              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#fff7ed' }}
            >
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#ea580c' }}>Hoy</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setWeekOffset((w: number) => w + 1); setSelectedIdx(null) }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-forward" size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>
      {/* Progress bar */}
      {total > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 1, height: 5, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 5, width: `${total > 0 ? (completed / total) * 100 : 0}%` as any, backgroundColor: '#22c55e', borderRadius: 3 }} />
          </View>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', fontVariant: ['tabular-nums'] }}>
            {completed}/{total}
          </Text>
        </View>
      )}
      {/* Dot cells */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {displaySessions.map((s) => {
          const hasSession = !!s.type && s.type !== 'DESCANSO'
          const isSelected = selectedIdx === s.dayIndex
          const dotBg = s.done && hasSession
            ? '#22c55e'
            : s.isToday
            ? 'white'
            : hasSession
            ? '#1e3a5f'
            : '#f3f4f6'
          const dotBorder = isSelected ? '#1e3a5f' : s.isToday ? '#ea580c' : 'transparent'
          const dotText = s.done && hasSession
            ? 'white'
            : s.isToday
            ? '#ea580c'
            : hasSession
            ? 'white'
            : '#9ca3af'

          return (
            <TouchableOpacity
              key={s.dayIndex}
              onPress={() => { Haptics.selectionAsync(); setSelectedIdx(isSelected ? null : s.dayIndex) }}
              style={{ alignItems: 'center', gap: 6, flex: 1 }}
            >
              <Text style={{
                fontSize: 11, fontFamily: s.isToday ? 'Inter_700Bold' : 'Inter_600SemiBold',
                color: s.isToday ? '#ea580c' : '#9ca3af',
              }}>
                {DOT_DAY_LETTERS[s.dayIndex]}
              </Text>
              <View style={{
                width: 38, height: 38, borderRadius: 10,
                backgroundColor: dotBg,
                borderWidth: s.isToday || isSelected ? 2 : 0,
                borderColor: dotBorder,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: dotText }}>
                  {s.done && hasSession ? '\u2713' : hasSession ? (SESSION_ICONS[s.type!] ?? '·') : '·'}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
      {/* Detail card for selected day */}
      {selectedSession && (selectedSession.type || selectedSession.isToday) && (
        <DotDetail session={selectedSession} />
      )}
    </View>
  )
}

// -- Full weekly strip (B2B/Pro with plan) ----------------------------------
// Unified: same 38x38 dot structure as DotWeekStrip, with PRO/B2B extras
function WeeklyStrip({ mainData, onLogSession }: {
  mainData: { weekSessions: WeekSession[]; completedCount: number; totalTraining: number; volumeDeltaPct: number | null }
  onLogSession: (s: WeekSession) => void
}) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const isCurrentWeek = weekOffset === 0

  const { data: weekData } = useQuery({
    queryKey: ['week-sessions', weekOffset],
    queryFn: () => getWeekSessions(weekOffset),
    enabled: weekOffset !== 0,
  })

  const sessions = isCurrentWeek ? mainData.weekSessions : (weekData?.weekSessions ?? mainData.weekSessions)
  const completed = isCurrentWeek ? mainData.completedCount : (weekData?.completedCount ?? 0)
  const total = isCurrentWeek ? mainData.totalTraining : (weekData?.totalTraining ?? 0)
  const weekLabel = isCurrentWeek ? getCurrentWeekLabel() : (weekData?.weekLabel ?? '...')
  const pct = total > 0 ? completed / total : 0

  const todayIdx = isCurrentWeek
    ? (sessions.find(s => s.isToday)?.dayIndex ?? -1)
    : -1

  const hasPastUnlogged = isCurrentWeek && sessions.some(s => !s.done && s.dayIndex < todayIdx && s.type && s.type !== 'DESCANSO')

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 14, ...SHADOW }}>
      {/* Header — same structure as DotWeekStrip */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          ESTA SEMANA
        </Text>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>
          {completed}/{total} sesiones
        </Text>
      </View>
      {/* Week nav — arrows at edges, label + "Hoy" centered */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setWeekOffset((w: number) => w - 1) }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={18} color="#6b7280" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>
            {weekLabel}
          </Text>
          {!isCurrentWeek && (
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setWeekOffset(() => 0) }}
              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#fff7ed' }}
            >
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#ea580c' }}>Hoy</Text>
            </TouchableOpacity>
          )}
          {isCurrentWeek && mainData.volumeDeltaPct != null && (
            <View style={{ backgroundColor: mainData.volumeDeltaPct >= 0 ? '#f0fdf4' : '#fff1f2', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: mainData.volumeDeltaPct >= 0 ? '#16a34a' : '#dc2626' }}>
                {mainData.volumeDeltaPct >= 0 ? '+' : ''}{mainData.volumeDeltaPct}% vol
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setWeekOffset((w: number) => w + 1) }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-forward" size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>
      {/* Progress bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1, height: 5, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: 5, width: `${pct * 100}%` as any, backgroundColor: '#22c55e', borderRadius: 3 }} />
        </View>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', fontVariant: ['tabular-nums'] }}>
          {completed}/{total}
        </Text>
      </View>
      {/* Dot cells — same 38x38 structure as DotWeekStrip */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {sessions.map((s) => {
          const hasSession = !!s.type && s.type !== 'DESCANSO'
          const isFuture = isCurrentWeek && s.dayIndex > todayIdx
          const isPast = isCurrentWeek && s.dayIndex < todayIdx
          const canLog = isCurrentWeek && hasSession && !s.done && !isFuture && !!s.id

          const dotBg = s.done && hasSession
            ? '#22c55e'
            : s.isToday
            ? 'white'
            : canLog && isPast
            ? '#fff7ed'
            : hasSession
            ? isFuture ? '#1e3a5f' : '#1e3a5f'
            : '#f3f4f6'
          const dotBorder = s.isToday ? '#ea580c'
            : canLog && isPast ? '#f97316'
            : 'transparent'
          const dotText = s.done && hasSession
            ? 'white'
            : s.isToday
            ? '#ea580c'
            : canLog && isPast
            ? '#f97316'
            : hasSession
            ? 'white'
            : '#9ca3af'

          const dotContent = s.done && hasSession
            ? '\u2713'
            : canLog && isPast
            ? '!'
            : hasSession
            ? (SESSION_ICONS[s.type!] ?? '·')
            : '·'

          const isSelected = selectedIdx === s.dayIndex
          const selBorder = isSelected ? '#1e3a5f' : dotBorder

          return (
            <TouchableOpacity
              key={s.dayIndex}
              onPress={() => {
                Haptics.selectionAsync()
                if (canLog) { onLogSession(s); return }
                setSelectedIdx(isSelected ? null : s.dayIndex)
              }}
              activeOpacity={0.7}
              style={{ alignItems: 'center', gap: 6, flex: 1 }}
            >
              <Text style={{
                fontSize: 11, fontFamily: s.isToday ? 'Inter_700Bold' : 'Inter_600SemiBold',
                color: s.isToday ? '#ea580c' : '#9ca3af',
              }}>
                {DOT_DAY_LETTERS[s.dayIndex]}
              </Text>
              <View style={{
                width: 38, height: 38, borderRadius: 10,
                backgroundColor: dotBg,
                borderWidth: s.isToday || (canLog && isPast) || isSelected ? 2 : 0,
                borderColor: selBorder,
                alignItems: 'center', justifyContent: 'center',
                opacity: isFuture && hasSession ? 0.4 : 1,
              }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: dotText }}>
                  {dotContent}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
      {hasPastUnlogged && (
        <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#f97316', marginTop: 8, textAlign: 'center' }}>
          Toca ! para registrar sesiones pasadas
        </Text>
      )}
      {/* Detail card for selected day */}
      {selectedIdx !== null && (() => {
        const sel = sessions.find(s => s.dayIndex === selectedIdx)
        return sel && (sel.type || sel.isToday) ? <DotDetail session={sel} onLog={onLogSession} /> : null
      })()}
    </View>
  )
}

// -- Hero Cards ---------------------------------------------------------------
const FORM_COLORS = {
  good:     { bg: '#f0fdf4', border: '#22c55e', label: '#166534', text: '#14532d', chip: '#bbf7d0', chipText: '#14532d' },
  moderate: { bg: '#fffbeb', border: '#f59e0b', label: '#92400e', text: '#78350f', chip: '#fde68a', chipText: '#78350f' },
  rest:     { bg: '#fef2f2', border: '#ef4444', label: '#991b1b', text: '#7f1d1d', chip: '#fecaca', chipText: '#7f1d1d' },
}

function HeroForma({ formStatus, formMessage, lastCheckIn, hrResting, weightKg, daysAgo }: {
  formStatus: 'good' | 'moderate' | 'rest'
  formMessage: string
  lastCheckIn: { energyLevel: number | null; hardestSessionRpe: number | null; sleepHours: number | null } | null
  hrResting: number | null
  weightKg: number | null
  daysAgo: number | null
}) {
  const c = FORM_COLORS[formStatus]
  const icon = formStatus === 'good' ? '\u26A1' : formStatus === 'moderate' ? '\u26A0\uFE0F' : '\uD83D\uDE34'
  const daysLabel = daysAgo === 0 ? 'hoy' : daysAgo === 1 ? 'ayer' : daysAgo != null ? `hace ${daysAgo} días` : ''
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: c.border }} />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: c.label, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {icon}  CÓMO LLEGAS HOY
          </Text>
          {daysLabel ? <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{daysLabel}</Text> : null}
        </View>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: c.text, marginBottom: 10 }}>
          {formMessage}
        </Text>
        {lastCheckIn && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {lastCheckIn.energyLevel != null && (
              <View style={{ backgroundColor: c.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: c.chipText }}>
                  Energía {lastCheckIn.energyLevel}/5
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
            {weightKg != null && (
              <View style={{ backgroundColor: c.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: c.chipText }}>
                  {weightKg} kg
                </Text>
              </View>
            )}
            {lastCheckIn.sleepHours != null && (
              <View style={{ backgroundColor: c.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: c.chipText }}>
                  Sueño {lastCheckIn.sleepHours >= 6.5 ? '\u2713' : `${lastCheckIn.sleepHours}h`}
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

function HeroCarrera({ raceDays, isRecomp, metrics }: {
  raceDays: number | null
  isRecomp: boolean
  metrics: { weightKg: number | null; weightGoalKg: number | null }
}) {
  if (isRecomp) {
    const kg = metrics.weightKg; const goal = metrics.weightGoalKg
    const diff = kg && goal ? Math.abs(kg - goal) : null
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
        <View style={{ height: 3, backgroundColor: '#f97316' }} />
        <View style={{ padding: 14 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
            🎯  TU OBJETIVO
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontSize: 34, fontFamily: 'Inter_900Black', color: '#f97316', letterSpacing: -1 }}>
              {diff != null ? diff.toFixed(1) : '\u2014'}
            </Text>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>kg restantes</Text>
          </View>
        </View>
      </View>
    )
  }
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#f97316' }} />
      <View style={{ padding: 14 }}>
        <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
          🏁  TU CARRERA
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text style={{ fontSize: 34, fontFamily: 'Inter_900Black', color: '#f97316', letterSpacing: -1 }}>
            {raceDays != null && raceDays > 0 ? raceDays : '\u2014'}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>días</Text>
        </View>
      </View>
    </View>
  )
}

// DAILY-02 -- widget de registro diario (peso + energia)
function TodayLogCard({ initial }: { initial: { weightKg: number | null; energyLevel: number | null } | null }) {
  const [weightInput, setWeightInput] = useState(initial?.weightKg != null ? String(initial.weightKg) : '')
  const [energy, setEnergy] = useState<number | null>(initial?.energyLevel ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(!initial)

  async function save() {
    const weightKg = weightInput ? parseFloat(weightInput) : undefined
    if (!weightKg && !energy) return
    setSaving(true)
    try {
      await apiFetch('/api/mobile/metrics/log', {
        method: 'POST',
        body: JSON.stringify({ ...(weightKg && { weightKg }), ...(energy && { energyLevel: energy }) }),
      })
      setSaved(true)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 10 }}>
      <TouchableOpacity onPress={() => setOpen(o => !o)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 15 }}>📋</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>Registro de hoy</Text>
          {(initial || saved) && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' }} />}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {initial?.weightKg && !open && (
            <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#374151' }}>{initial.weightKg} kg</Text>
          )}
          {initial?.energyLevel && !open && (
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#f97316' }}>E{initial.energyLevel}/5</Text>
          )}
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#9ca3af" />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6b7280', width: 60 }}>Peso (kg)</Text>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="ej. 70.5"
              placeholderTextColor="#d1d5db"
              keyboardType="decimal-pad"
              style={{ flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827', backgroundColor: '#f9fafb' }}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>Energia</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => { Haptics.selectionAsync(); setEnergy(n) }}
                  style={{ flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: energy === n ? '#f97316' : '#f3f4f6' }}
                >
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: energy === n ? 'white' : '#6b7280' }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'center' }}>1 = sin energía · 5 = excelente</Text>
          </View>
          <TouchableOpacity
            onPress={save}
            disabled={saving}
            style={{ backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: 'white' }}>{saving ? 'Guardando...' : 'Guardar'}</Text>
          </TouchableOpacity>
        </View>
      )}
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
            META DE PESO
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={{ fontSize: 30, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
              {metrics.weightKg ?? '\u2014'}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>kg</Text>
            {metrics.weightGoalKg && (
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#22c55e' }}>
                {'\u2192'} {metrics.weightGoalKg} kg
              </Text>
            )}
          </View>
          {!metrics.weightKg && (
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#ea580c', marginTop: 4 }}>
              Configura tu meta {'\u2192'}
            </Text>
          )}
          {weeklyWeightChange != null && (
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: changeColor, marginTop: 4 }}>
              {weeklyWeightChange > 0 ? '+' : ''}{weeklyWeightChange} kg esta semana
            </Text>
          )}
        </View>
        <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 72 }}>
          <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#22c55e', letterSpacing: -0.5 }}>
            {weightProgressPct != null ? `${weightProgressPct}%` : '0%'}
          </Text>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>
            del objetivo
          </Text>
          {weightProgressPct == null && (
            <Text style={{ fontSize: 8, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'center', marginTop: 2 }}>
              sin datos aun
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}

// -- Figma FREE "Today" card (centered, no session) -------------------------
function FreeTodayCardFigma({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#ea580c' }} />
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18, alignItems: 'center', gap: 8 }}>
        {/* HOY label */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ea580c' }} />
          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#ea580c', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            HOY
          </Text>
        </View>
        {/* Orange circle with check icon */}
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(234,88,12,0.1)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark-circle-outline" size={32} color="#ea580c" />
        </View>
        <Text style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: '#111827' }}>
          Sin sesión planificada
        </Text>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
          Registra tu entrenamiento de hoy
        </Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(app)/log-run') }}
          activeOpacity={0.85}
          style={{ backgroundColor: '#ea580c', borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%', marginTop: 6 }}
        >
          <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: 'white' }}>
            Registrar actividad {'\u2192'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// -- Figma "TU ACTIVIDAD" section -------------------------------------------
function TuActividadCard({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <View>
      <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        TU ACTIVIDAD
      </Text>
      <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
        <View style={{ height: 3, backgroundColor: '#ea580c' }} />
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <View style={{ backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Última actividad
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); router.push('/(app)/log-run') }}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>{'\uD83C\uDFC3'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                Registra tu primera sesión
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#ea580c', marginTop: 2 }}>
                Running · Entreno · Lo que practiques {'\u2192'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// -- Figma DS "Card Desbloquea Pro" (3186:31) — warm light bg ----------------
function DesbloquearProCard({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <TouchableOpacity
      onPress={() => router.push('/(app)/pricing' as any)}
      activeOpacity={0.85}
      style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: 'rgba(234,89,9,0.3)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14 }}>{'\u26A1'}</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#993300' }}>
            Desbloquea Plan Pro
          </Text>
        </View>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#8c4d1a' }}>
          Check-in · zonas · progreso
        </Text>
      </View>
      <View style={{ backgroundColor: '#ea5909', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, width: 72, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'white' }}>Ver Pro</Text>
      </View>
    </TouchableOpacity>
  )
}

// -- Figma DS "Banner_Entrenador" (3405:63) — navy + accent bar --------------
function FindCoachCard({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <TouchableOpacity
      onPress={() => router.push('/(app)/find-coach' as any)}
      activeOpacity={0.85}
      style={{ backgroundColor: '#1e3a5f', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 14, overflow: 'hidden' }}
    >
      <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: '#ea5809' }} />
      <View style={{ flex: 1, gap: 2, paddingVertical: 10 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
          🎯  Encuentra tu entrenador
        </Text>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#b2cce5' }}>
          Planes personalizados con un experto
        </Text>
      </View>
      <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#ea5809' }}>Ver coaches {'\u2192'}</Text>
    </TouchableOpacity>
  )
}

const RUN_TYPE_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2', FARTLEK: 'Fartlek', TEMPO: 'Tempo',
  INTERVALOS: 'Intervalos', TIRADA_LARGA: 'Tirada larga', OTRO: 'Sesion libre',
}

export default function DashboardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()
  const [freeWeekOffset, setFreeWeekOffset] = useState(0)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: getNotifications,
    staleTime: 30_000,
  })
  const unreadCount = notifData?.unreadCount ?? 0

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
        <Text style={{ fontSize: 40, marginBottom: 12 }}>{'\u26A0\uFE0F'}</Text>
        <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1e3a5f', textAlign: 'center' }}>
          No se pudo cargar
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', marginTop: 6, marginBottom: 20 }}>
          Revisa tu conexion e intenta de nuevo.
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
  const isFree = d.mode === 'FREE'
  const modeLabel = isFree ? 'FREE' : d.isB2B ? 'B2B' : 'PRO'

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
      contentContainerStyle={{ paddingBottom: 28, gap: 12 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
      showsVerticalScrollIndicator={false}
    >
      {/* -- Gradient Header ------------------------------------------------ */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 22, paddingHorizontal: 20, gap: 6 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 22, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.3 }}
          >
            {getGreeting()}, {firstName}
          </Text>
          {/* Mode badge (outlined) */}
          <View style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: 'white', textTransform: 'uppercase', letterSpacing: 1 }}>
              {modeLabel}
            </Text>
          </View>
          {/* Bell icon */}
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); router.push('/(app)/notifications') }}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color="white" />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute', top: 4, right: 2,
                backgroundColor: '#f97316', borderRadius: 8,
                minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: 3,
              }}>
                <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: 'white' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {/* Date */}
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' }}>
          {formatDate()}
        </Text>
        {/* Pills row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {d.planData && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
                Semana {d.planData.currentWeek}/{d.planData.totalWeeks} · {PHASE_DISPLAY[d.planData.phase] ?? d.planData.phase}
              </Text>
            </View>
          )}
          {d.streakDays > 0 ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
                {'\uD83D\uDD25'} {d.streakDays} días · racha
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.5)' }}>
                {'\u2014'} sin racha aún
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>

        {/* ============================================================== */}
        {/* FREE MODE — Figma-aligned layout                               */}
        {/* ============================================================== */}
        {isFree && !d.todaySession && (
          <>
            {/* HOY card */}
            <FreeTodayCardFigma router={router} />

            {/* ESTA SEMANA — dot strip */}
            <DotWeekStrip
              sessions={d.weekSessions}
              weekOffset={freeWeekOffset}
              setWeekOffset={setFreeWeekOffset}
              completedCount={d.completedCount}
              totalTraining={d.totalTraining}
            />

            {/* TU ACTIVIDAD */}
            {!d.hasEverLogged && <TuActividadCard router={router} />}

            {/* Actividad reciente (si ya tiene logs) */}
            {d.hasEverLogged && (d.recentActivity?.length ?? 0) > 0 && (
              <View>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  TU ACTIVIDAD
                </Text>
                <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
                  <View style={{ height: 3, backgroundColor: '#ea580c' }} />
                  {(d.recentActivity ?? []).slice(0, 3).map((a, i) => (
                    <View
                      key={i}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#f3f4f6' }}
                    >
                      <Text style={{ fontSize: 22 }}>{SESSION_ICONS[a.type] ?? '\uD83C\uDFC5'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                          {SESSION_LABELS[a.type] ?? a.type.toLowerCase().replace(/_/g, ' ')}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 1 }}>
                          {new Date(a.completedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {a.durationMin ? `  ·  ${a.durationMin} min` : ''}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* META DE PESO */}
            <HeroPeso
              metrics={d.metrics}
              weeklyWeightChange={d.weeklyWeightChange}
              weightProgressPct={d.weightProgressPct}
            />

            {/* NUTRICION HOY */}
            {d.nutritionTarget && (
              <View>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  NUTRICION HOY
                </Text>
                <NutritionBanner
                  kcal={d.nutritionTarget.kcal}
                  proteinG={d.nutritionTarget.proteinG}
                  carbsG={d.nutritionTarget.carbsG}
                  fatG={d.nutritionTarget.fatG}
                  label={d.nutritionTarget.label}
                  onPress={() => router.push('/(app)/(tabs)/nutrition')}
                />
              </View>
            )}

            {/* Desbloquea Pro + Encuentra coach */}
            <DesbloquearProCard router={router} />
            <FindCoachCard router={router} />
          </>
        )}

        {/* ============================================================== */}
        {/* NON-FREE or FREE with todaySession — original layout           */}
        {/* ============================================================== */}
        {(!isFree || d.todaySession) && (
          <>
            {/* Orientacion post-onboarding */}
            {!d.hasEverLogged && user?.onboardingCompleted && (
              <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
                <View style={{ height: 3, backgroundColor: '#f97316' }} />
                <View style={{ padding: 18, gap: 14 }}>
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>
                      Por donde empezar?
                    </Text>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', lineHeight: 19 }}>
                      Tu cuenta esta lista. Aqui los tres primeros pasos para comenzar tu seguimiento.
                    </Text>
                  </View>
                  <View style={{ gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(app)/(tabs)/plan') }}
                      activeOpacity={0.85}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14 }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20 }}>{'\uD83D\uDCC5'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>Ver tu plan</Text>
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 1 }}>Sesiones de esta semana</Text>
                      </View>
                      <Text style={{ fontSize: 16, color: '#d1d5db' }}>{'\u203A'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(app)/(tabs)/gym') }}
                      activeOpacity={0.85}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14 }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20 }}>{'\uD83D\uDCAA'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>Registrar sesión de gym</Text>
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 1 }}>Pesas, series y repeticiones</Text>
                      </View>
                      <Text style={{ fontSize: 16, color: '#d1d5db' }}>{'\u203A'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(app)/(tabs)/nutrition') }}
                      activeOpacity={0.85}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14 }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20 }}>{'\uD83E\uDD57'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>Ver tu nutricion</Text>
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 1 }}>Macros y plan de comidas</Text>
                      </View>
                      <Text style={{ fontSize: 16, color: '#d1d5db' }}>{'\u203A'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Today session card */}
            {d.todaySession ? (
              <View style={{ borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
                <LinearGradient
                  colors={['#1e3a5f', '#2d5a8e']}
                  style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 8 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.55)', letterSpacing: 1, textTransform: 'uppercase' }}>
                      HOY
                    </Text>
                    <View style={{ backgroundColor: 'rgba(34,197,94,0.28)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#86efac' }}>
                        {'\u25CF'} Zona {d.todaySession.zoneTarget}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 34 }}>{SESSION_ICONS[d.todaySession.type] ?? '\uD83C\uDFC5'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>
                        {d.todaySession.durationMin} min
                      </Text>
                    </View>
                    {d.todaySession.completed && (
                      <View style={{ backgroundColor: '#22c55e', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ color: 'white', fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{'\u2713'} Hecha</Text>
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
                        {d.todaySession!.id === 'gym-today' ? 'Ir al Entreno \u2192' : 'Registrar sesión'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : d.mode === 'RECOVERY' ? (
              <View style={{ borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
                <View style={{ height: 3, backgroundColor: '#22c55e' }} />
                <View style={{ backgroundColor: '#f0fdf4', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Text style={{ fontSize: 32 }}>{'\uD83C\uDFC6'}</Text>
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
                <Text style={{ fontSize: 28 }}>{'\uD83D\uDE34'}</Text>
                <View>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>Día de descanso</Text>
                  <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>Recupera bien hoy</Text>
                </View>
              </View>
            )}

            {/* Weekly Strip */}
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

            {/* Coach card (B2B) */}
            {d.coach && (
              <CoachCard
                name={d.coach.name}
                headline={d.coach.headline}
                initial={d.coach.initial}
                onPress={() => router.push('/(app)/messages')}
              />
            )}

            {/* Check-in pendiente */}
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
                    Registra métricas · tu plan se ajusta automáticamente {'\u2192'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Resumen rapido */}
            <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 }}>
              Resumen rápido
            </Text>

            {d.lastCheckIn && (
              <HeroForma
                formStatus={d.formStatus}
                formMessage={d.formMessage}
                lastCheckIn={d.lastCheckIn}
                hrResting={d.metrics.hrResting}
                weightKg={d.metrics.weightKg}
                daysAgo={d.lastCheckinDaysAgo ?? null}
              />
            )}

            <HeroCarrera
              raceDays={d.raceDays}
              isRecomp={d.isRecomp}
              metrics={d.metrics}
            />

            <HeroPeso
              metrics={d.metrics}
              weeklyWeightChange={d.weeklyWeightChange}
              weightProgressPct={d.weightProgressPct}
            />

            <HeroCarga
              currentVolume={d.currentVolume}
              volumeDeltaPct={d.volumeDeltaPct}
              completedCount={d.completedCount}
              totalTraining={d.totalTraining}
            />

            {d.nutritionTarget && (
              <NutritionBanner
                kcal={d.nutritionTarget.kcal}
                proteinG={d.nutritionTarget.proteinG}
                carbsG={d.nutritionTarget.carbsG}
                fatG={d.nutritionTarget.fatG}
                label={d.nutritionTarget.label}
                onPress={() => router.push('/(app)/(tabs)/nutrition')}
              />
            )}

            <TodayLogCard initial={d.todayLog ?? null} />

            {/* Actividad reciente (B2B/Pro) */}
            {(d.recentActivity?.length ?? 0) > 0 && (
              <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
                <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Actividad reciente
                  </Text>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#f97316' }}>{d.streakDays > 0 ? `\uD83D\uDD25 ${d.streakDays} días de racha` : ''}</Text>
                </View>
                {(d.recentActivity ?? []).map((a, i) => (
                  <View
                    key={i}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#f3f4f6' }}
                  >
                    <Text style={{ fontSize: 22 }}>{SESSION_ICONS[a.type] ?? '\uD83C\uDFC5'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                        {SESSION_LABELS[a.type] ?? a.type.toLowerCase().replace(/_/g, ' ')}
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
          </>
        )}
      </View>
    </ScrollView>
  )
}
