import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Modal } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDashboard, getWeekSessions, type WeekSession, type DashboardData } from '../../../src/api/dashboard'
import { apiFetch } from '../../../src/api/client'
import { getNotifications } from '../../../src/api/notifications'
import { useAuthStore } from '../../../src/store/auth'
import SharePreviewModal from '../../../src/components/SharePreviewModal'
import type { ShareCardProps } from '../../../src/components/ShareCard'

import { SESSION_ICONS, SESSION_LABELS } from '../../../src/constants/sessions'
import CoachCard from '../../../src/components/dashboard/CoachCard'
import HeroCarga from '../../../src/components/dashboard/HeroCarga'
import NutritionBanner from '../../../src/components/dashboard/NutritionBanner'
import CalendarStrip, { type DayCell } from '../../../src/components/CalendarStrip'

const STREAK_MILESTONE_KEY = 'medaliq:streak_milestone_seen'
const STREAK_MILESTONES = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52]

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

function sessionsToCalendarDays(sessions: WeekSession[], weekOffset: number): DayCell[] {
  const now = new Date()
  const jsDay = now.getDay() === 0 ? 7 : now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (jsDay - 1) + weekOffset * 7)
  const isCurrentWeek = weekOffset === 0
  const todayIdx = isCurrentWeek ? sessions.findIndex(s => s.isToday) : -1

  return sessions.map(s => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + s.dayIndex)
    const hasSession = !!s.type && s.type !== 'DESCANSO'
    const isPastUnlogged = isCurrentWeek && hasSession && !s.done && s.dayIndex < todayIdx && !!s.id
    return {
      dow: s.dayIndex,
      letter: DOT_DAY_LETTERS[s.dayIndex],
      dateNum: d.getDate(),
      type: s.type,
      done: s.done,
      isToday: s.isToday,
      canLog: isPastUnlogged,
    }
  })
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

// -- Quick session feedback (Figma: ¿Cómo te sentiste?) ----------------------
function QuickSessionFeedback({ sessionType, durationMin, zoneTarget, logId }: {
  sessionType: string
  durationMin: number
  zoneTarget: string
  logId: string | null
}) {
  const [selected, setSelected] = useState<'tired' | 'regular' | 'strong' | null>(null)
  const label = SESSION_LABELS[sessionType] ?? sessionType.toLowerCase().replace(/_/g, ' ')
  const icon = SESSION_ICONS[sessionType] ?? '\uD83C\uDFC5'
  const zone = zoneTarget && zoneTarget !== 'N/A' && zoneTarget !== 'LIBRE' ? ` · ${zoneTarget}` : ''

  const handleSelect = async (feeling: 'tired' | 'regular' | 'strong') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelected(feeling)
    if (logId) {
      const rpeMap = { tired: 3, regular: 5, strong: 8 }
      try { await apiFetch(`/api/mobile/log/session/${logId}/rpe`, { method: 'PATCH', body: JSON.stringify({ rpe: rpeMap[feeling] }) }) } catch {}
    }
  }

  const options = [
    { key: 'tired' as const, icon: '\uD83C\uDF19', label: 'Cansado' },
    { key: 'regular' as const, icon: '\u23F0', label: 'Regular' },
    { key: 'strong' as const, icon: '\uD83D\uDCAA', label: 'Fuerte' },
  ]

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 18, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#22c55e' }} />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontSize: 10, fontFamily: 'Inter_700Bold' }}>{'\u2713'}</Text>
          </View>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#22c55e', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Sesión de hoy
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>
            {label} · {durationMin} min{zone}
          </Text>
        </View>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textAlign: 'center', marginBottom: 10 }}>
          {'\u00BF'}Cómo te sentiste?
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => handleSelect(opt.key)}
              activeOpacity={0.8}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
                borderWidth: selected === opt.key ? 2 : 1,
                borderColor: selected === opt.key ? '#1e3a5f' : '#e5e7eb',
                backgroundColor: selected === opt.key ? '#f0f4f8' : 'white',
              }}
            >
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{opt.icon}</Text>
              <Text style={{ fontSize: 11, fontFamily: selected === opt.key ? 'Inter_700Bold' : 'Inter_600SemiBold', color: selected === opt.key ? '#1e3a5f' : '#6b7280' }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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

function buildWeekShareProps(weekSessions: WeekSession[], completedCount: number, totalTraining: number): ShareCardProps {
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const now = new Date()
  const dow = now.getDay() === 0 ? 7 : now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - (dow - 1))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const weekStart = `${mon.getDate()} ${months[mon.getMonth()]}`
  const weekEnd = `${sun.getDate()} ${months[sun.getMonth()]} ${sun.getFullYear()}`
  const dayStates = weekSessions.map((s): 0|1|2|3 => {
    if (!s.done) return 0
    if (s.type === 'INTERVALOS' || s.type === 'FUERZA') return 3
    if (s.type === 'TEMPO' || s.type === 'FARTLEK') return 2
    return 1
  })
  return {
    variant: 'weekly',
    weekStart,
    weekEnd,
    dayStates,
    sessionsCompleted: completedCount,
    sessionsTotal: totalTraining,
    date: `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
  }
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
  const [calendarSelectedIdx, setCalendarSelectedIdx] = useState<number | null>(null)
  const [showStreakModal, setShowStreakModal] = useState(false)
  const [streakShareProps, setStreakShareProps] = useState<ShareCardProps | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const milestoneCheckedRef = useRef(false)
  // SHARE-07: season completed
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [seasonShareProps, setSeasonShareProps] = useState<ShareCardProps | null>(null)
  const [showSeasonShareModal, setShowSeasonShareModal] = useState(false)
  const seasonCheckedRef = useRef(false)
  // SHARE-08: Sunday share
  const [showSundayShare, setShowSundayShare] = useState(false)
  const [sundayShareProps, setSundayShareProps] = useState<ShareCardProps | null>(null)
  const isSunday = new Date().getDay() === 0

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

  // Milestone detection — show once per milestone level
  useEffect(() => {
    if (!data || milestoneCheckedRef.current) return
    const ws = data.weekStreak ?? 0
    if (!STREAK_MILESTONES.includes(ws)) return
    milestoneCheckedRef.current = true

    AsyncStorage.getItem(STREAK_MILESTONE_KEY).then(stored => {
      const lastSeen = parseInt(stored ?? '0') || 0
      if (ws > lastSeen) {
        const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
        const now = new Date()
        setStreakShareProps({
          variant: 'streak',
          streakWeeks: ws,
          streakDays: data.streakDays,
          date: `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
        })
        setShowStreakModal(true)
      }
    }).catch(() => {/* ignore */})
  }, [data])

  function handleDismissStreak() {
    const ws = data?.weekStreak ?? 0
    if (ws > 0) AsyncStorage.setItem(STREAK_MILESTONE_KEY, String(ws)).catch(() => {/* ignore */})
    setShowStreakModal(false)
  }

  // SHARE-07: show season-completed modal once per plan
  useEffect(() => {
    if (!data?.justCompletedPlan || seasonCheckedRef.current) return
    seasonCheckedRef.current = true
    const plan = data.justCompletedPlan
    const key = `medaliq:season_completed_seen:${plan.name}`
    AsyncStorage.getItem(key).then(seen => {
      if (!seen) {
        const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
        const now = new Date()
        setSeasonShareProps({
          variant: 'season',
          seasonNumber: plan.seasonNumber,
          planName: plan.name,
          totalWeeks: plan.totalWeeks,
          totalSessions: plan.totalSessions,
          totalKm: plan.totalKm ?? undefined,
          adherencePct: plan.adherencePct ?? undefined,
          date: `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
        })
        setShowSeasonModal(true)
      }
    }).catch(() => {/* ignore */})
  }, [data])

  function handleDismissSeason() {
    const plan = data?.justCompletedPlan
    if (plan) AsyncStorage.setItem(`medaliq:season_completed_seen:${plan.name}`, '1').catch(() => {/* ignore */})
    setShowSeasonModal(false)
  }

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
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
      contentContainerStyle={{ paddingBottom: 28, gap: 12 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
      showsVerticalScrollIndicator={false}
    >
      {/* -- Gradient Header ------------------------------------------------ */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 12, paddingBottom: 6, paddingHorizontal: 20 }}
      >
        {/* TopGroup */}
        <View style={{ gap: 4 }}>
          {/* GreetingRow: greeting + icons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontSize: 22, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.3 }}
            >
              {getGreeting()}!
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {d.streakDays >= 2 ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                  borderWidth: 1, borderColor: 'rgba(249,115,22,0.5)', borderRadius: 10,
                  paddingHorizontal: 7, paddingVertical: 3,
                }}>
                  <Text style={{ fontSize: 11 }}>🔥</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#f97316' }}>{d.streakDays}</Text>
                </View>
              ) : (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
                  paddingHorizontal: 7, paddingVertical: 3,
                }}>
                  <Text style={{ fontSize: 11, opacity: 0.5 }}>🔥</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.3)' }}>{d.streakDays}</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); router.push('/(app)/notifications') }}
                style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={22} color="white" />
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute', top: -2, right: -4,
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
          </View>
          {/* UserName */}
          <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.8)' }}>
            {firstName}
          </Text>
        </View>

        {/* DateLabel — centered */}
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#999', textAlign: 'center', marginTop: 6 }}>
          {formatDate()}
        </Text>

        {/* WeekNav */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', marginTop: 6,
          backgroundColor: '#1e3a5f', borderRadius: 8, overflow: 'hidden',
        }}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setFreeWeekOffset((w: number) => w - 1) }}
            style={{ width: 36, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}
          >
            <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 12, fontFamily: 'Inter_500Medium', color: 'white' }}>
            {d.planData
              ? `Semana ${d.planData.currentWeek} · ${getCurrentWeekLabel()}`
              : getCurrentWeekLabel()}
          </Text>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setFreeWeekOffset((w: number) => w + 1) }}
            style={{ width: 36, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}
          >
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>

        {/* ============================================================== */}
        {/* FREE MODE — Figma-aligned layout                               */}
        {/* ============================================================== */}
        {isFree && !d.todaySession && (
          <>
            {/* CalendarStrip — before HOY card per Figma */}
            <CalendarStrip
              days={sessionsToCalendarDays(d.weekSessions, freeWeekOffset)}
              selectedDow={calendarSelectedIdx}
              onSelect={setCalendarSelectedIdx}
              completedCount={d.completedCount}
              totalTraining={d.totalTraining}
            />

            {/* HOY card */}
            <FreeTodayCardFigma router={router} />

            {/* SHARE-08: Sunday weekly share */}
            {isSunday && d.completedCount > 0 && (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setSundayShareProps(buildWeekShareProps(d.weekSessions, d.completedCount, d.totalTraining)); setShowSundayShare(true) }}
                activeOpacity={0.85}
                style={{ backgroundColor: '#1e3a5f', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, overflow: 'hidden' }}
              >
                <View style={{ width: 3, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#ea580c' }} />
                <Text style={{ fontSize: 22 }}>{'\uD83D\uDCC5'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: 'white' }}>
                    {d.completedCount}/{d.totalTraining} sesiones esta semana
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                    Comparte tu resumen semanal {'\u2197'}
                  </Text>
                </View>
                <View style={{ backgroundColor: '#ea580c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: 'white' }}>Compartir</Text>
                </View>
              </TouchableOpacity>
            )}

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

            {/* Insights Pro upsell */}
            {d.hasEverLogged && (
              <TouchableOpacity
                onPress={() => router.push('/(app)/pricing' as any)}
                activeOpacity={0.85}
                style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}
              >
                <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    {'\u2728'} Insights Pro
                  </Text>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 8 }}>
                    Desbloquea con Plan Pro
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['Check-in', 'RPE', 'Zonas'].map(label => (
                      <View key={label} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
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

            {/* Registro de hoy */}
            <TodayLogCard initial={d.todayLog ?? null} />

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
            {/* Calendar Strip — before TodaySession per Figma */}
            {d.weekSessions.length > 0 && (
              <CalendarStrip
                days={sessionsToCalendarDays(d.weekSessions, freeWeekOffset)}
                selectedDow={calendarSelectedIdx}
                onSelect={(dow) => {
                  const s = d.weekSessions.find(ws => ws.dayIndex === dow)
                  const hasSession = s && s.type && s.type !== 'DESCANSO'
                  const todayIdx = d.weekSessions.findIndex(ws => ws.isToday)
                  const isPastUnlogged = hasSession && !s.done && dow < todayIdx && !!s.id
                  if (isPastUnlogged) {
                    router.push({
                      pathname: '/(app)/log',
                      params: { sessionId: s.id!, type: s.type!, duration: String(s.durationMin ?? ''), zone: s.zoneTarget ?? '2' },
                    })
                    return
                  }
                  setCalendarSelectedIdx(dow === calendarSelectedIdx ? null : dow)
                }}
                completedCount={d.completedCount}
                totalTraining={d.totalTraining}
              />
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
                    {d.todaySession.zoneTarget ? (
                      <View style={{ backgroundColor: 'rgba(34,197,94,0.28)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#86efac' }}>
                          {'\u25CF'} Zona {d.todaySession.zoneTarget}
                        </Text>
                      </View>
                    ) : d.todaySession.id === 'gym-today' ? (
                      <View style={{ backgroundColor: 'rgba(234,89,12,0.28)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#fdba74' }}>
                          {'\u25CF'} Fuerza
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 34 }}>{SESSION_ICONS[d.todaySession.type] ?? '\uD83C\uDFC5'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>
                        {d.todaySession.id === 'gym-today' && d.workoutName
                          ? d.workoutName
                          : `${d.todaySession.durationMin} min`}
                      </Text>
                    </View>
                    {d.todaySession.completed && (
                      <View style={{ backgroundColor: '#22c55e', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ color: 'white', fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{'\u2713'} Hecha</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular' }}>
                    {d.todaySession.id === 'gym-today' ? 'Entreno de fuerza' : d.todaySession.type.toLowerCase().replace(/_/g, ' ')}
                  </Text>
                </LinearGradient>
                {d.todaySession.completed ? (
                  d.todaySession.id === 'gym-today' && (
                    <View style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12 }}>
                      <TouchableOpacity
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(app)/(tabs)/gym') }}
                        activeOpacity={0.85}
                        style={{ backgroundColor: '#1e3a5f', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                      >
                        <Text style={{ color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>Ver resumen {'\u2192'}</Text>
                      </TouchableOpacity>
                    </View>
                  )
                ) : (
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

            {/* Quick feedback — ¿Cómo te sentiste? (Figma: sesión completada) */}
            {d.todaySession?.completed && (
              <QuickSessionFeedback
                sessionType={d.todaySession.type}
                durationMin={d.todaySession.durationMin}
                zoneTarget={d.todaySession.zoneTarget}
                logId={null}
              />
            )}

            {/* SHARE-08: Sunday weekly share */}
            {isSunday && d.completedCount > 0 && (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setSundayShareProps(buildWeekShareProps(d.weekSessions, d.completedCount, d.totalTraining)); setShowSundayShare(true) }}
                activeOpacity={0.85}
                style={{ backgroundColor: '#1e3a5f', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, overflow: 'hidden' }}
              >
                <View style={{ width: 3, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#ea580c' }} />
                <Text style={{ fontSize: 22 }}>{'\uD83D\uDCC5'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: 'white' }}>
                    {d.completedCount}/{d.totalTraining} sesiones esta semana
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                    Comparte tu resumen semanal {'\u2197'}
                  </Text>
                </View>
                <View style={{ backgroundColor: '#ea580c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: 'white' }}>Compartir</Text>
                </View>
              </TouchableOpacity>
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

    {/* ── Streak Milestone Modal ─────────────────────────────────────── */}
    <Modal
      visible={showStreakModal}
      transparent
      animationType="fade"
      onRequestClose={handleDismissStreak}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 28, width: '100%', alignItems: 'center', gap: 16 }}>
          <Text style={{ fontSize: 52 }}>{'\uD83D\uDD25'}</Text>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', textAlign: 'center' }}>
              {streakShareProps?.streakWeeks} semanas seguidas
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>
              {d.streakDays} días de racha activa. Sigue así — eso es disciplina real.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#fff7ed', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, width: '100%', justifyContent: 'center' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>{d.streakDays}</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>días racha</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#fed7aa' }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#ea580c' }}>{streakShareProps?.streakWeeks}</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>semanas</Text>
            </View>
          </View>

          <View style={{ width: '100%', gap: 10 }}>
            <TouchableOpacity
              onPress={() => { setShowShareModal(true) }}
              activeOpacity={0.85}
              style={{ backgroundColor: '#ea580c', borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              <Text style={{ fontSize: 16, color: 'white' }}>{'\u2191'}</Text>
              <Text style={{ color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>Compartir logro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDismissStreak}
              activeOpacity={0.85}
              style={{ backgroundColor: '#f1f5f9', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
            >
              <Text style={{ color: '#6b7280', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* ── Streak Share Preview Modal ─────────────────────────────────── */}
    {streakShareProps && (
      <SharePreviewModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        card={streakShareProps}
        title="Compartir racha"
      />
    )}

    {/* ── Temporada Completada Modal (SHARE-07) ──────────────────────── */}
    <Modal
      visible={showSeasonModal}
      transparent
      animationType="slide"
      onRequestClose={handleDismissSeason}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: '#1a2744', borderRadius: 24, padding: 28, width: '100%', alignItems: 'center', gap: 18 }}>
          <Text style={{ fontSize: 52 }}>{'\uD83C\uDFC6'}</Text>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#FFCC37', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Temporada {seasonShareProps?.seasonNumber ?? 1} completada
            </Text>
            <Text style={{ fontSize: 24, fontFamily: 'Inter_900Black', color: 'white', textAlign: 'center' }}>
              {seasonShareProps?.planName ?? 'Plan completado'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', width: '100%', gap: 0 }}>
            {seasonShareProps?.totalWeeks != null && (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#FFCC37' }}>{seasonShareProps.totalWeeks}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' }}>semanas</Text>
              </View>
            )}
            {(seasonShareProps?.totalSessions ?? 0) > 0 && (
              <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' }}>
                <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#FFCC37' }}>{seasonShareProps?.totalSessions}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' }}>sesiones</Text>
              </View>
            )}
            {seasonShareProps?.totalKm != null && (
              <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' }}>
                <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#FFCC37' }}>{seasonShareProps.totalKm}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' }}>km totales</Text>
              </View>
            )}
            {seasonShareProps?.adherencePct != null && (
              <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' }}>
                <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#FFCC37' }}>{seasonShareProps.adherencePct}%</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' }}>adherencia</Text>
              </View>
            )}
          </View>

          <View style={{ width: '100%', gap: 10 }}>
            <TouchableOpacity
              onPress={() => setShowSeasonShareModal(true)}
              activeOpacity={0.85}
              style={{ backgroundColor: '#ea580c', borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              <Text style={{ fontSize: 16, color: 'white' }}>{'\u2191'}</Text>
              <Text style={{ color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>Compartir temporada</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDismissSeason}
              activeOpacity={0.85}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {seasonShareProps && (
      <SharePreviewModal
        visible={showSeasonShareModal}
        onClose={() => setShowSeasonShareModal(false)}
        card={seasonShareProps}
        title="Compartir temporada"
      />
    )}

    {/* ── Sunday Weekly Share Modal (SHARE-08) ───────────────────────── */}
    {sundayShareProps && (
      <SharePreviewModal
        visible={showSundayShare}
        onClose={() => setShowSundayShare(false)}
        card={sundayShareProps}
        title="Compartir semana"
      />
    )}
    </>
  )
}
