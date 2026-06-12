import { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { getPlan, type PlannedSession } from '../../../src/api/plan'
import { getDashboard } from '../../../src/api/dashboard'
import { useAuthStore } from '../../../src/store/auth'
import UpgradeWall from '../../../src/components/UpgradeWall'

// ── Constants ────────────────────────────────────────────────────────

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DAY_SHORT   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS      = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const SESSION_ICONS: Record<string, string> = {
  RODAJE_Z2: '🏃', FARTLEK: '🏃', TIRADA_LARGA: '🏃', TEMPO: '🏃',
  INTERVALOS: '⚡', SIMULACRO: '🏁', TEST: '📊',
  CICLA: '🚴', NATACION: '🏊', FUERZA: '💪', DESCANSO: '😴', OTRO: '🏅',
}

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2', FARTLEK: 'Fartlek', TIRADA_LARGA: 'Tirada Larga',
  TEMPO: 'Tempo', INTERVALOS: 'Intervalos', SIMULACRO: 'Simulacro', TEST: 'Test',
  CICLA: 'Cicla', NATACION: 'Natación', FUERZA: 'Fuerza', DESCANSO: 'Descanso', OTRO: 'Entrenamiento',
}

const PLAN_NAME_MAP: Record<string, string> = {
  RACE_HALF_MARATHON: 'Media Maratón', RACE_MARATHON: 'Maratón',
  RACE_10K: '10K', RACE_5K: '5K',
  RACE_CYCLING: 'Ciclismo', RACE_TRIATHLON: 'Triatlón',
  BODY_RECOMPOSITION: 'Recomposición Corporal',
  WEIGHT_LOSS: 'Pérdida de Peso', GENERAL_FITNESS: 'Fitness General',
  HALF_MARATHON_18W: 'Media Maratón', TEN_K_12W: '10K',
  FIVE_K_8W: '5K', BODY_RECOMPOSITION_16W: 'Recomposición Corporal',
}

const INTENSITY_BADGE: Record<string, { bg: string; text: string; emoji: string; label: string }> = {
  HIGH:     { bg: '#fff7ed', text: '#ea580c', emoji: '🔥', label: 'ALTA intensidad' },
  MODERATE: { bg: '#fffbeb', text: '#d97706', emoji: '💪', label: 'MODERADA'        },
  LOW:      { bg: '#f0fdf4', text: '#16a34a', emoji: '🌿', label: 'BAJA intensidad' },
  REST:     { bg: '#f9fafb', text: '#9ca3af', emoji: '😴', label: 'Descanso'        },
}

const PHASES_ORDER = ['BASE', 'DESARROLLO', 'ESPECIFICO', 'AFINAMIENTO']
const PHASE_SHORT: Record<string, string> = {
  BASE: 'BASE', DESARROLLO: 'DESARRO', ESPECIFICO: 'ESPECÍF.', AFINAMIENTO: 'AFIN.',
}
const PHASE_SHORT_GYM: Record<string, string> = {
  BASE: 'ADAPT.', DESARROLLO: 'VOLUM.', ESPECIFICO: 'INTENS.', AFINAMIENTO: 'PICO',
}

const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
}

const ZONE_COLORS: Record<string, string> = {
  Z1: '#22c55e', Z2: '#3b82f6', Z3: '#eab308', Z4: '#f97316', Z5: '#ef4444',
}

// ── Helpers ──────────────────────────────────────────────────────────

function parseStructureBlock(line: string): { zone: string | null; color: string; durationMin: number | null; text: string } {
  const parts = line.split('|')
  if (parts.length === 3) {
    const zone = parts[0].trim().toUpperCase()
    const durationMin = parseInt(parts[1].trim(), 10) || null
    const text = parts[2].trim()
    return { zone, color: ZONE_COLORS[zone] ?? '#9ca3af', durationMin, text }
  }
  // Old plain-text fallback
  const match = line.match(/\b(Z[1-5])\b/i)
  if (!match) return { zone: null, color: '#d1d5db', durationMin: null, text: line }
  const zone = match[1].toUpperCase()
  return { zone, color: ZONE_COLORS[zone] ?? '#9ca3af', durationMin: null, text: line }
}

function getIntensityKey(type: string, intensityField?: string | null): string {
  if (intensityField) return intensityField
  if (['INTERVALOS', 'TIRADA_LARGA', 'SIMULACRO', 'TEST'].includes(type)) return 'HIGH'
  if (['TEMPO', 'FARTLEK', 'CICLA', 'NATACION', 'FUERZA', 'OTRO'].includes(type)) return 'MODERATE'
  if (type === 'RODAJE_Z2') return 'LOW'
  if (type === 'DESCANSO') return 'REST'
  return 'MODERATE'
}

function formatPlanName(name: string): string {
  const base = name.split(' — ')[0].split(' - ')[0].replace(/^Plan\s+/i, '').trim()
  return PLAN_NAME_MAP[base] ?? base
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function getWeekMonday(currentWeekNum: number, activeWeekNum: number): Date {
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 7 : today.getDay()
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() - (todayDow - 1))
  thisMonday.setHours(0, 0, 0, 0)
  const monday = new Date(thisMonday)
  monday.setDate(thisMonday.getDate() + (activeWeekNum - currentWeekNum) * 7)
  return monday
}

function formatWeekRange(monday: Date): string {
  const sun = new Date(monday); sun.setDate(monday.getDate() + 6)
  if (monday.getMonth() === sun.getMonth()) {
    return `${monday.getDate()}–${sun.getDate()} ${MONTHS[monday.getMonth()]}`
  }
  return `${monday.getDate()} ${MONTHS[monday.getMonth()]} – ${sun.getDate()} ${MONTHS[sun.getMonth()]}`
}

// ── CalendarStrip ────────────────────────────────────────────────────

type DayInfo = {
  dow: number; letter: string; dateNum: number
  type: string | null; done: boolean; isToday: boolean; canLog: boolean
}

function CalendarStrip({ days, selectedDow, onSelect, completedCount, totalTraining }: {
  days: DayInfo[]
  selectedDow: number
  onSelect: (dow: number) => void
  completedCount: number
  totalTraining: number
}) {
  const pct = totalTraining > 0 ? completedCount / totalTraining : 0

  return (
    <View style={{ backgroundColor: 'white' }}>
      {/* Progress bar */}
      <View style={{ marginHorizontal: 16, marginTop: 14, height: 2, backgroundColor: '#e5e7eb', borderRadius: 1, overflow: 'hidden' }}>
        <View style={{ height: 2, width: `${pct * 100}%` as any, backgroundColor: '#22c55e', borderRadius: 1 }} />
      </View>

      {/* Day cells */}
      <View style={{ flexDirection: 'row', paddingTop: 8, paddingBottom: 16 }}>
        {days.map(day => {
          const isSelected = day.dow === selectedDow
          const isRest = !day.type || day.type === 'DESCANSO'
          const isSelectedNonToday = isSelected && !day.isToday
          const circleColor = day.done && !isRest
            ? '#22c55e'
            : day.isToday
              ? '#f97316'
              : isSelectedNonToday
                ? 'transparent'
                : day.canLog
                  ? '#fff7ed'
                  : 'transparent'
          const numColor = day.done || day.isToday
            ? 'white'
            : isSelectedNonToday ? '#1e3a5f'
            : day.canLog ? '#f97316' : '#6b7280'
          const letterBold = day.isToday || isSelected
          const hasBorder = day.canLog && !day.done && !day.isToday && !isSelectedNonToday
          const circleBorderWidth = day.isToday || isSelectedNonToday ? 2 : hasBorder ? 1.5 : 0
          const circleBorderColor = day.isToday && isSelected
            ? '#1e3a5f'
            : day.isToday
              ? 'rgba(249,115,22,0.35)'
              : isSelectedNonToday ? '#1e3a5f' : '#f97316'

          return (
            <TouchableOpacity
              key={day.dow}
              style={{ flex: 1, alignItems: 'center', gap: 4 }}
              onPress={() => { Haptics.selectionAsync(); onSelect(day.dow) }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: 10,
                fontFamily: letterBold ? 'Inter_700Bold' : 'Inter_500Medium',
                color: day.isToday ? '#f97316' : isSelected ? '#1e3a5f' : '#9ca3af',
              }}>
                {day.letter}
              </Text>
              <View style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: circleColor,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: circleBorderWidth,
                borderColor: circleBorderColor,
              }}>
                {day.done && !isRest ? (
                  <Text style={{ fontSize: 14, color: 'white' }}>✓</Text>
                ) : (
                  <Text style={{
                    fontSize: 13,
                    fontFamily: day.isToday || isSelected ? 'Inter_700Bold' : 'Inter_400Regular',
                    color: numColor,
                  }}>
                    {day.dateNum}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={{ height: 1, backgroundColor: '#e5e7eb' }} />
    </View>
  )
}

// ── SessionDetailCard ────────────────────────────────────────────────

function SessionDetailCard({ session, isToday, onLog }: {
  session: PlannedSession
  isToday: boolean
  onLog: () => void
}) {
  if (session.type === 'DESCANSO') {
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 16, flexDirection: 'row', overflow: 'hidden', ...SHADOW }}>
        <View style={{ width: 4, backgroundColor: '#d1d5db', alignSelf: 'stretch' }} />
        <View style={{ flex: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 28 }}>😴</Text>
          <View>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#374151' }}>Día de descanso</Text>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>Recupera bien hoy</Text>
          </View>
        </View>
      </View>
    )
  }

  const intensityKey = getIntensityKey(session.type, session.intensity)
  const badge = INTENSITY_BADGE[intensityKey] ?? INTENSITY_BADGE.MODERATE
  const stripColor = isToday ? '#f97316' : session.completed ? '#22c55e' : session.type === 'FUERZA' ? '#8b5cf6' : '#1e3a5f'
  const gymSession = session.type === 'FUERZA'
  const structureText = session.detailText ?? session.coachNote ?? null

  const sessionTitle = gymSession
    ? (session.sportLabel ? `Fuerza — ${session.sportLabel}` : 'Fuerza')
    : (SESSION_LABELS[session.type] ?? session.type.replace(/_/g, ' '))

  const hasZone = session.zoneTarget && session.zoneTarget !== '—' && session.zoneTarget !== 'N/A' && session.zoneTarget !== ''
  const middleBadge = gymSession
    ? (session.sportLabel ?? session.type.replace(/_/g, ' '))
    : hasZone ? `Zona ${session.zoneTarget}` : null

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 4, backgroundColor: stripColor, alignSelf: 'stretch' }} />
        <View style={{ flex: 1, padding: 16, gap: 12 }}>

          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28 }}>{SESSION_ICONS[session.type] ?? '🏅'}</Text>
            <Text style={{ flex: 1, fontSize: 18, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.3 }}>
              {sessionTitle}
            </Text>
            {isToday && (
              <View style={{ backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: 'white' }}>HOY</Text>
              </View>
            )}
            {session.completed && !isToday && (
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 12 }}>✓</Text>
              </View>
            )}
          </View>

          {/* Badges row */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#374151' }}>
                {session.durationMin} min
              </Text>
            </View>
            {middleBadge != null && (
              <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#374151' }}>
                  {middleBadge}
                </Text>
              </View>
            )}
            <View style={{ backgroundColor: badge.bg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: badge.text }}>
                {badge.emoji} {badge.label}
              </Text>
            </View>
          </View>

          {/* Structure / Exercises */}
          {structureText ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {gymSession ? 'Ejercicios' : 'Estructura'}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#f1f5f9' }} />
              </View>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 180 }}
              >
                {structureText.split('\n').filter(Boolean).map((line, idx) => {
                  const { zone, color, durationMin, text } = parseStructureBlock(line)
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      {/* Zone dot + label */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2, width: 36 }}>
                        <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: color }} />
                        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color, lineHeight: 14 }}>
                          {zone ?? ''}
                        </Text>
                      </View>
                      {/* Duration */}
                      {durationMin != null && (
                        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827', width: 44, paddingTop: 1 }}>
                          {durationMin} m
                        </Text>
                      )}
                      {/* Description */}
                      <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#374151', lineHeight: 20 }}>
                        {text}
                      </Text>
                    </View>
                  )
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </View>

      {/* CTA */}
      {!session.completed && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 }}>
          <TouchableOpacity
            onPress={onLog}
            activeOpacity={0.85}
            style={{ backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>Registrar sesión →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ── KPI Cards ────────────────────────────────────────────────────────

function KPICards({ completed, total, volumeLabel, adherencePct }: {
  completed: number; total: number; volumeLabel: string; adherencePct: number
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[
        { label: 'Completadas', value: `${completed} / ${total}`, sub: 'sesiones',   color: '#111827' },
        { label: 'Volumen',     value: volumeLabel,               sub: 'esta semana', color: '#111827' },
        { label: 'Adherencia',  value: `${adherencePct}%`,        sub: 'meta: 80%',  color: '#f97316' },
      ].map((kpi, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 12, ...SHADOW }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_500Medium', color: '#9ca3af', marginBottom: 4 }}>
            {kpi.label}
          </Text>
          <Text style={{ fontSize: 17, fontFamily: 'Inter_900Black', color: kpi.color, letterSpacing: -0.5 }}>
            {kpi.value}
          </Text>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
            {kpi.sub}
          </Text>
        </View>
      ))}
    </View>
  )
}

// ── NutritionCard ────────────────────────────────────────────────────

function NutritionCard({ kcal, proteinG, carbsG, fatG }: {
  kcal: number; proteinG: number; carbsG: number; fatG: number
}) {
  const macros = [
    { label: 'Proteína', value: proteinG, bg: '#eef2ff' },
    { label: 'Carbos',   value: carbsG,   bg: '#fff1f0' },
    { label: 'Grasas',   value: fatG,     bg: '#f0fdf4' },
  ]

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 16, ...SHADOW }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22c55e' }} />
        <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Plan nutricional del día
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        {/* Kcal */}
        <View style={{ minWidth: 90 }}>
          <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#f97316', letterSpacing: -1 }}>
            {kcal.toLocaleString('es')}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#9ca3af', marginTop: 4 }}>kcal</Text>
        </View>

        {/* Macro pills */}
        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
          {macros.map(m => (
            <View key={m.label} style={{
              flex: 1, backgroundColor: m.bg, borderRadius: 10,
              paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center',
            }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#6b7280', marginBottom: 6 }}>
                {m.label}
              </Text>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                {m.value} g
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

// ── PhaseBar ─────────────────────────────────────────────────────────

type PlanWeekForPhase = { weekNumber: number; phase: string }

function PhaseBar({ planPhases, currentPhase, currentWeekNum, totalWeeks, weeks, isGymPlan }: {
  planPhases: string[]; currentPhase: string
  currentWeekNum: number; totalWeeks: number
  weeks: PlanWeekForPhase[]; isGymPlan?: boolean
}) {
  const display = PHASES_ORDER.filter(p => planPhases.includes(p))
  if (display.length === 0) return null

  const activeIdx = display.indexOf(currentPhase)
  const pct = Math.round((currentWeekNum / totalWeeks) * 100)

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 14, ...SHADOW }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827' }}>Progreso del plan</Text>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
          Sem. {currentWeekNum}/{totalWeeks} · {pct}%
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {display.map((phase, idx) => {
          const isActive   = idx === activeIdx
          const isCompleted = idx < activeIdx
          const count = weeks.filter(w => w.phase === phase).length || 1
          const barColor = isActive ? '#1e3a5f' : isCompleted ? '#22c55e' : '#e5e7eb'
          const textColor = isActive ? '#1e3a5f' : isCompleted ? '#16a34a' : '#9ca3af'
          return (
            <View key={phase} style={{ flex: count, alignItems: 'center', gap: 5 }}>
              <View style={{ height: 6, width: '100%', borderRadius: 3, backgroundColor: barColor }} />
              <Text style={{ fontSize: 8, fontFamily: isActive ? 'Inter_700Bold' : 'Inter_500Medium', color: textColor }}>
                {isCompleted ? '✓ ' : ''}{(isGymPlan ? PHASE_SHORT_GYM : PHASE_SHORT)[phase] ?? phase}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ── AdherenceChart ────────────────────────────────────────────────────

type AdherenceWeek = { weekNumber: number; sessions: { type: string; completed: boolean; dayOfWeek: number }[] }

function AdherenceChart({ weeks, currentWeekNum, totalWeeks, todayDow }: {
  weeks: AdherenceWeek[]; currentWeekNum: number; totalWeeks: number; todayDow: number
}) {
  const startWeek = Math.max(1, Math.min(currentWeekNum - 2, totalWeeks - 4))
  const slots = Array.from({ length: 5 }, (_, i) => {
    const weekNum = startWeek + i
    if (weekNum > totalWeeks) return null
    const weekData  = weeks.find(w => w.weekNumber === weekNum)
    const isFuture  = weekNum > currentWeekNum
    const isCurrent = weekNum === currentWeekNum
    if (!weekData || isFuture) return { weekNum, pct: 0, isCurrent, isFuture: true }
    const sessions = isCurrent
      ? weekData.sessions.filter(s => s.dayOfWeek <= todayDow)
      : weekData.sessions
    const t = sessions.filter(s => s.type !== 'DESCANSO').length
    const c = sessions.filter(s => s.completed && s.type !== 'DESCANSO').length
    return { weekNum, pct: t > 0 ? (c / t) * 100 : 0, isCurrent, isFuture: false }
  }).filter(Boolean) as { weekNum: number; pct: number; isCurrent: boolean; isFuture: boolean }[]

  if (slots.length === 0) return null

  const pastSlots = slots.filter(s => !s.isFuture)
  const avgPct = pastSlots.length > 0
    ? Math.round(pastSlots.reduce((sum, s) => sum + s.pct, 0) / pastSlots.length)
    : 0

  const MAX_H = 40

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 14, ...SHADOW }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827' }}>Adherencia semanal</Text>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>Promedio {avgPct}%</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: MAX_H + 18, gap: 6 }}>
        {slots.map(({ weekNum, pct, isCurrent, isFuture }) => {
          const barH = isFuture ? 4 : pct === 0 ? 3 : Math.max(8, pct * MAX_H / 100)
          const barColor = isFuture ? '#e5e7eb' : pct === 0 ? '#d1d5db' : isCurrent ? '#f97316' : '#3b82f6'
          return (
            <View key={weekNum} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ width: '100%', height: barH, borderRadius: 4, backgroundColor: barColor }} />
              <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>S{weekNum}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ── PlanScreen ───────────────────────────────────────────────────────

export default function PlanScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()

  const todayDow = useMemo(() => {
    const d = new Date().getDay()
    return d === 0 ? 7 : d
  }, [])

  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null)
  const [selectedDow, setSelectedDow] = useState(todayDow)

  const { data: plan, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['plan'], queryFn: getPlan })
  const { data: dash } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })

  if (!user?.features?.plan) {
    return (
      <UpgradeWall
        icon="📅"
        title="Mi Plan"
        description="Accede a tu plan periodizado, CalendarStrip interactivo y métricas semanales con el plan Pro."
      />
    )
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

  // ── Derived state ────────────────────────────────────────────────

  const currentWeekNum    = plan.currentWeek
  const activeWeekNum     = selectedWeekNum ?? currentWeekNum
  const isCurrentWeek     = activeWeekNum === currentWeekNum
  const week              = plan.weeks.find(w => w.weekNumber === activeWeekNum) ?? plan.weeks[0]
  const realCurrentPhase  = plan.weeks.find(w => w.weekNumber === currentWeekNum)?.phase ?? 'BASE'
  const allPhases         = [...new Set(plan.weeks.map(w => w.phase))]

  // Week dates (Mon–Sun of active week)
  const weekMonday = getWeekMonday(currentWeekNum, activeWeekNum)
  const weekDates  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekMonday)
    d.setDate(weekMonday.getDate() + i)
    return d
  })

  // Calendar strip days
  const stripDays: DayInfo[] = Array.from({ length: 7 }, (_, i) => {
    const dow     = i + 1
    const session = week?.sessions.find(s => s.dayOfWeek === dow)
    const isToday  = isCurrentWeek && dow === todayDow
    const isFuture = isCurrentWeek && dow > todayDow
    const canLog   = !!session && session.type !== 'DESCANSO'
                  && !session.completed && !isFuture && !!session.id
    return {
      dow, letter: DAY_LETTERS[i], dateNum: weekDates[i].getDate(),
      type: session?.type ?? null,
      done: session?.completed ?? false,
      isToday, canLog,
    }
  })

  // Selected session
  const selectedSession = week?.sessions.find(s => s.dayOfWeek === selectedDow) ?? null
  const selectedLabel   = `${DAY_SHORT[selectedDow - 1]} ${weekDates[selectedDow - 1]?.getDate()}`

  // KPI — adherencia solo cuenta sesiones hasta hoy (no sesiones futuras de la semana)
  const completedCount = week?.sessions.filter(s => s.completed && s.type !== 'DESCANSO').length ?? 0
  const todaySessions  = isCurrentWeek
    ? (week?.sessions.filter(s => s.type !== 'DESCANSO' && s.dayOfWeek <= todayDow) ?? [])
    : (week?.sessions.filter(s => s.type !== 'DESCANSO') ?? [])
  const totalTraining  = isCurrentWeek ? todaySessions.length : (week?.sessions.filter(s => s.type !== 'DESCANSO').length ?? 0)
  const adherencePct   = totalTraining > 0 ? Math.round((completedCount / totalTraining) * 100) : 0

  // Volume label
  const gymPlan = plan.name.toLowerCase().includes('recomp')
    || plan.name.toLowerCase().includes('body')
    || plan.name.toLowerCase().includes('fuerza')
    || (week?.sessions.filter(s => s.type === 'FUERZA').length ?? 0) >
       (week?.sessions.filter(s => s.type !== 'FUERZA' && s.type !== 'DESCANSO').length ?? 0)

  let volumeLabel: string
  if (gymPlan) {
    const totalMin = week?.sessions
      .filter(s => s.completed && s.type !== 'DESCANSO')
      .reduce((sum, s) => sum + (s.durationMin ?? 0), 0) ?? 0
    volumeLabel = totalMin > 0 ? formatTime(totalMin) : '0 min'
  } else {
    const vol = isCurrentWeek ? (dash?.currentVolume ?? null) : null
    if (vol != null) {
      volumeLabel = `${vol} km`
    } else {
      const totalMin = week?.sessions
        .filter(s => s.type !== 'DESCANSO')
        .reduce((sum, s) => sum + (s.durationMin ?? 0), 0) ?? 0
      volumeLabel = formatTime(totalMin)
    }
  }

  // Nutrition (from dashboard — today's adjusted target)
  const nt = dash?.nutritionTarget ?? null

  // ── Handlers ────────────────────────────────────────────────────

  function handleWeekChange(delta: number) {
    Haptics.selectionAsync()
    const next = activeWeekNum + delta
    if (next < 1 || next > plan.totalWeeks) return
    setSelectedWeekNum(next)
    // Keep selected dow or fall back to first session of new week
    const nextWeek = plan.weeks.find(w => w.weekNumber === next)
    const hasDow   = nextWeek?.sessions.some(s => s.dayOfWeek === selectedDow)
    if (!hasDow) {
      const first = nextWeek?.sessions.find(s => s.type !== 'DESCANSO')
      if (first) setSelectedDow(first.dayOfWeek)
    }
  }

  function handleLogSession() {
    if (!selectedSession) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push({
      pathname: '/(app)/log',
      params: {
        sessionId: selectedSession.id,
        type:      selectedSession.type,
        duration:  String(selectedSession.durationMin),
        zone:      selectedSession.zoneTarget || '—',
      },
    })
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>

      {/* ── Header ── */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 20, gap: 4 }}
      >
        {/* Title + Phase badge */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.3 }}>
            Mi Plan
          </Text>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 20,
            paddingHorizontal: 10, paddingVertical: 4, marginTop: 2,
          }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: 'rgba(147,197,253,1)' }}>
              {realCurrentPhase} · Sem {currentWeekNum}/{plan.totalWeeks}
            </Text>
          </View>
        </View>

        {/* Subtitle */}
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' }}>
          {formatPlanName(plan.name)} · {plan.totalWeeks} semanas
        </Text>

        {/* WeekNav */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', marginTop: 8,
          backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 8, overflow: 'hidden',
        }}>
          <TouchableOpacity
            onPress={() => handleWeekChange(-1)}
            disabled={activeWeekNum <= 1}
            style={{ width: 36, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}
          >
            <Ionicons name="chevron-back" size={16} color={activeWeekNum <= 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)'} />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 13, fontFamily: 'Inter_500Medium', color: 'white' }}>
            Semana {activeWeekNum} · {formatWeekRange(weekMonday)}
          </Text>
          <TouchableOpacity
            onPress={() => handleWeekChange(1)}
            disabled={activeWeekNum >= plan.totalWeeks}
            style={{ width: 36, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}
          >
            <Ionicons name="chevron-forward" size={16} color={activeWeekNum >= plan.totalWeeks ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)'} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Calendar Strip ── */}
      <CalendarStrip
        days={stripDays}
        selectedDow={selectedDow}
        onSelect={setSelectedDow}
        completedCount={completedCount}
        totalTraining={totalTraining}
      />

      {/* ── Scrollable content ── */}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
      >
        {/* Session header label */}
        <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Sesión seleccionada — {selectedLabel}
        </Text>

        {/* Session card */}
        {selectedSession ? (
          <SessionDetailCard
            session={selectedSession}
            isToday={isCurrentWeek && selectedDow === todayDow}
            onLog={handleLogSession}
          />
        ) : (
          <View style={{ backgroundColor: 'white', borderRadius: 16, flexDirection: 'row', overflow: 'hidden', ...SHADOW }}>
            <View style={{ width: 4, backgroundColor: '#d1d5db', alignSelf: 'stretch' }} />
            <View style={{ flex: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 28 }}>😴</Text>
              <View>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#374151' }}>Día de descanso</Text>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>Recupera bien hoy</Text>
              </View>
            </View>
          </View>
        )}

        {/* KPI section */}
        <Text style={{
          fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#9ca3af',
          textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4,
        }}>
          Semana en números
        </Text>
        <KPICards
          completed={completedCount}
          total={totalTraining}
          volumeLabel={volumeLabel}
          adherencePct={adherencePct}
        />

        {/* Nutrition card */}
        {nt && (
          <NutritionCard
            kcal={nt.kcal}
            proteinG={nt.proteinG}
            carbsG={nt.carbsG}
            fatG={nt.fatG}
          />
        )}

        {/* Phase bar */}
        <PhaseBar
          planPhases={allPhases}
          currentPhase={realCurrentPhase}
          currentWeekNum={currentWeekNum}
          totalWeeks={plan.totalWeeks}
          weeks={plan.weeks}
          isGymPlan={gymPlan}
        />

        {/* Adherence chart */}
        <AdherenceChart
          weeks={plan.weeks}
          currentWeekNum={currentWeekNum}
          totalWeeks={plan.totalWeeks}
          todayDow={todayDow}
        />
      </ScrollView>
    </View>
  )
}
