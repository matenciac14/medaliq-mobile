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
import NutritionBanner from '../../../src/components/dashboard/NutritionBanner'
import HydrationWidget from '../../../src/components/dashboard/HydrationWidget'
import MealSlotsWidget from '../../../src/components/dashboard/MealSlotsWidget'
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

const DOT_DAY_LETTERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

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




// -- Consolidated Metrics Cards (match web MobileCardsSection) ----------------

const FORM_ACCENT = {
  good:     { accent: '#22c55e', statusText: '#166534', chipBg: '#dcfce7', chipText: '#166534', label: 'Buena forma' },
  moderate: { accent: '#f59e0b', statusText: '#92400e', chipBg: '#fef3c7', chipText: '#92400e', label: 'Moderado' },
  rest:     { accent: '#ef4444', statusText: '#991b1b', chipBg: '#fee2e2', chipText: '#991b1b', label: 'Descanso' },
}

function MetricCol({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color }}>{value}</Text>
        {unit ? <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{unit}</Text> : null}
      </View>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{label}</Text>
    </View>
  )
}

function ProMetricsCard({ formStatus, formMessage, lastCheckIn, formCheckInDaysAgo, currentWeight, targetWeight, weeklyWeightChange, weightProgressPct, currentVolume, volumeDeltaPct, isRecomp, raceDays }: {
  formStatus: 'good' | 'moderate' | 'rest'
  formMessage: string
  lastCheckIn: { hardestSessionRpe: number | null; energyLevel: number | null; sleepHours: number | null } | null
  formCheckInDaysAgo: number | null
  currentWeight: number | null
  targetWeight: number | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null
  currentVolume: number | null
  volumeDeltaPct: number | null
  isRecomp: boolean
  raceDays: number | null
}) {
  const c = FORM_ACCENT[formStatus]
  const daysLabel = formCheckInDaysAgo === 0 ? 'hoy' : formCheckInDaysAgo === 1 ? 'ayer' : formCheckInDaysAgo != null ? `hace ${formCheckInDaysAgo} d` : ''

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: c.accent }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 10 }}>
        {/* Row 1: status + chip + ago */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: c.statusText }}>{formMessage}</Text>
            <View style={{ backgroundColor: c.chipBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: c.chipText }}>{c.label}</Text>
            </View>
          </View>
          {daysLabel ? <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{daysLabel}</Text> : null}
        </View>

        {/* Row 2: 4 metrics */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <MetricCol label="Peso" value={currentWeight ? currentWeight.toFixed(1) : '--'} unit="kg" color="#1e3a5f" />
          <MetricCol label="RPE" value={lastCheckIn?.hardestSessionRpe != null ? String(lastCheckIn.hardestSessionRpe) : '--'} unit="/10" color="#ea580c" />
          <MetricCol label="Energia" value={lastCheckIn?.energyLevel != null ? `${lastCheckIn.energyLevel}/5` : '--'} unit="" color="#22c55e" />
          <MetricCol label="Carga" value={currentVolume != null ? String(currentVolume) : '--'} unit="km" color="#1e3a5f" />
        </View>

        {/* Row 3: race countdown or weight progress */}
        {raceDays != null && raceDays > 0 && !isRecomp && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ fontSize: 12 }}>🏁</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f', flex: 1 }}>{raceDays} dias para tu carrera</Text>
            {weightProgressPct != null && (
              <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>Peso {weightProgressPct}%</Text>
            )}
          </View>
        )}

        {isRecomp && currentWeight != null && targetWeight != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ fontSize: 12 }}>🎯</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f', flex: 1 }}>
              {Math.abs(currentWeight - targetWeight).toFixed(1)} kg restantes
            </Text>
            {weeklyWeightChange != null && (
              <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: weeklyWeightChange < 0 ? '#22c55e' : '#ef4444' }}>
                {weeklyWeightChange > 0 ? '+' : ''}{weeklyWeightChange.toFixed(1)} kg/sem
              </Text>
            )}
          </View>
        )}

        {volumeDeltaPct != null && (
          <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: volumeDeltaPct >= 0 ? '#22c55e' : '#ef4444' }}>
            {volumeDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(volumeDeltaPct)}% carga vs sem. anterior
          </Text>
        )}
      </View>
    </View>
  )
}

function FreeMetricsCard({ currentWeight, targetWeight, weeklyWeightChange, weightProgressPct }: {
  currentWeight: number | null
  targetWeight: number | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null
}) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#1e3a5f' }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>Tu progreso</Text>
          {weeklyWeightChange != null && (
            <View style={{ backgroundColor: weeklyWeightChange < 0 ? '#dcfce7' : '#fee2e2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: weeklyWeightChange < 0 ? '#166534' : '#ef4444' }}>
                {weeklyWeightChange > 0 ? '+' : ''}{weeklyWeightChange.toFixed(1)} kg/sem
              </Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <MetricCol label="Peso" value={currentWeight ? currentWeight.toFixed(1) : '--'} unit="kg" color="#1e3a5f" />
          <MetricCol label="Meta" value={targetWeight ? String(targetWeight) : '--'} unit="kg" color="#22c55e" />
          <MetricCol label="Progreso" value={weightProgressPct != null ? String(weightProgressPct) : '--'} unit="%" color="#1e3a5f" />
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

// -- Figma FREE "Today" card (centered, no session) -------------------------
function FreeTodayCardFigma({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#ea580c' }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 8 }}>
        {/* HOY label */}
        <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#ea580c', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          ● HOY
        </Text>
        {/* Icon + title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 28 }}>🎯</Text>
          <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
            Sin sesión
          </Text>
        </View>
        <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
          Sin sesión planificada
        </Text>
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
          Registra tu entrenamiento de hoy
        </Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(app)/log-run') }}
          activeOpacity={0.85}
          style={{ backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 10, alignItems: 'center', width: '100%', marginTop: 2 }}
        >
          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: 'white' }}>
            Registrar actividad →
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
      try { await apiFetch(`/api/mobile/log/session/${logId}`, { method: 'PATCH', body: JSON.stringify({ rpe: rpeMap[feeling] }) }) } catch {}
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

// WeekActivityCard and TuActividadCard removed — replaced by FreeMetricsCard + RecentActivity inline

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
  // dow: 1=Mon … 7=Sun (ISO)
  const todayDow = (() => { const day = new Date().getDay(); return day === 0 ? 7 : day })()

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
          flexDirection: 'row', alignItems: 'center', marginTop: 6, marginHorizontal: 16,
          height: 26,
        }}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setFreeWeekOffset((w: number) => w - 1) }}
            style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={14} color="#1e3a5f" />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 12, fontFamily: 'Inter_500Medium', color: '#1e3a5f' }}>
            {d.planData
              ? `Semana ${d.planData.currentWeek}  ·  ${getCurrentWeekLabel()}`
              : getCurrentWeekLabel()}
          </Text>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setFreeWeekOffset((w: number) => w + 1) }}
            style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-forward" size={14} color="#1e3a5f" />
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

            {/* Nutricion */}
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

            {/* Hidratacion */}
            <HydrationWidget />

            {/* Alimentacion */}
            <MealSlotsWidget />

            {/* Metricas — peso */}
            <FreeMetricsCard
              currentWeight={d.metrics.weightKg}
              targetWeight={d.metrics.weightGoalKg}
              weeklyWeightChange={d.weeklyWeightChange}
              weightProgressPct={d.weightProgressPct}
            />

            {/* Registro de hoy */}
            <TodayLogCard initial={d.todayLog ?? null} />

            {/* Actividad reciente */}
            {d.hasEverLogged && (d.recentActivity?.length ?? 0) > 0 && (
              <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6', ...SHADOW }}>
                <View style={{ height: 3, backgroundColor: '#ea580c' }} />
                <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Actividad reciente
                  </Text>
                  {d.streakDays > 0 && (
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#ea580c' }}>🔥 {d.streakDays} dias de racha</Text>
                  )}
                </View>
                {(d.recentActivity ?? []).slice(0, 4).map((a, i) => (
                  <View
                    key={i}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#f3f4f6' }}
                  >
                    <Text style={{ fontSize: 22 }}>{SESSION_ICONS[a.type] ?? '🏅'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                        {SESSION_LABELS[a.type] ?? a.type.toLowerCase().replace(/_/g, ' ')}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 1 }}>
                        {new Date(a.completedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {a.durationMin ? ` · ${a.durationMin} min` : ''}
                      </Text>
                    </View>
                    {a.rpe != null && (
                      <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>RPE {a.rpe}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* CTAs */}
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

            {/* #4 — Banner: sugerencias de ajuste del coach pendientes */}
            {(d.pendingSuggestionsCount ?? 0) > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(app)/(tabs)/checkin')}
                style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Text style={{ fontSize: 20 }}>{'💡'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>
                        {d.pendingSuggestionsCount === 1
                          ? '1 sugerencia de ajuste pendiente'
                          : `${d.pendingSuggestionsCount} sugerencias de ajuste pendientes`}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>Tu coach propone cambios basados en el check-in</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#93c5fd" />
                </View>
              </TouchableOpacity>
            )}

            {/* #14 — Plan Completion Card (RECOVERY mode) */}
            {d.mode === 'RECOVERY' && d.completedPlanName && (
              <View style={{ borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
                <View style={{ height: 3, backgroundColor: '#22c55e' }} />
                <View style={{ backgroundColor: '#f0fdf4', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Text style={{ fontSize: 32 }}>{'🏆'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#16a34a', letterSpacing: 1.5, textTransform: 'uppercase' }}>Plan completado</Text>
                    <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#14532d', marginTop: 4 }}>{d.completedPlanName}</Text>
                    <Text style={{ fontSize: 12, color: '#22c55e', marginTop: 4 }}>
                      {d.recoveryDaysLeft != null && d.recoveryDaysLeft > 0
                        ? `Recuperación activa · ${d.recoveryDaysLeft} días restantes`
                        : 'Listo para un nuevo plan'}
                    </Text>
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
                    <Text style={{ fontSize: 28 }}>{SESSION_ICONS[d.todaySession.type] ?? '\uD83C\uDFC5'}</Text>
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
                        style={{ backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                      >
                        <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_700Bold' }}>Ver resumen →</Text>
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
                      style={{ backgroundColor: '#f97316', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                    >
                      <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_700Bold' }}>
                        {d.todaySession!.id === 'gym-today' ? 'Ir al Entreno →' : 'Registrar sesión'}
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

            {/* #26 — Gym today card: when no running session but gym day is scheduled */}
            {!d.todaySession && d.workoutName && d.weeklyRoutine?.days?.find(day => day.dow === todayDow && day.activity === 'GYM') && (
              <TouchableOpacity
                onPress={() => router.push('/(app)/(tabs)/gym')}
                style={{ borderRadius: 20, overflow: 'hidden', ...SHADOW }}
              >
                <LinearGradient colors={['#1e3a5f', '#2d5a8e']} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 8 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.55)', letterSpacing: 1.5, textTransform: 'uppercase' }}>Hoy</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 28 }}>{'💪'}</Text>
                    <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>{d.workoutName}</Text>
                  </View>
                </LinearGradient>
                <View style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12 }}>
                  <View style={{ backgroundColor: '#ea580c', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: 'white' }}>Empezar</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Quick feedback — ¿Cómo te sentiste? (Figma: sesión completada) */}
            {d.todaySession?.completed && (
              <QuickSessionFeedback
                sessionType={d.todaySession.type}
                durationMin={d.todaySession.durationMin}
                zoneTarget={d.todaySession.zoneTarget}
                logId={d.todaySession.logId ?? null}
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

            {/* Nutricion */}
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

            {/* Hidratacion */}
            <HydrationWidget />

            {/* Alimentacion */}
            <MealSlotsWidget />

            {/* Metricas consolidadas */}
            <ProMetricsCard
              formStatus={d.formStatus}
              formMessage={d.formMessage}
              lastCheckIn={d.lastCheckIn}
              formCheckInDaysAgo={d.lastCheckinDaysAgo ?? null}
              currentWeight={d.metrics.weightKg}
              targetWeight={d.metrics.weightGoalKg}
              weeklyWeightChange={d.weeklyWeightChange}
              weightProgressPct={d.weightProgressPct}
              currentVolume={d.currentVolume}
              volumeDeltaPct={d.volumeDeltaPct}
              isRecomp={d.isRecomp}
              raceDays={d.raceDays}
            />

            {/* Registro de hoy */}
            <TodayLogCard initial={d.todayLog ?? null} />

            {/* Actividad reciente */}
            {(d.recentActivity?.length ?? 0) > 0 && (
              <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6', ...SHADOW }}>
                <View style={{ height: 3, backgroundColor: '#ea580c' }} />
                <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Actividad reciente
                  </Text>
                  {d.streakDays > 0 && (
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#ea580c' }}>🔥 {d.streakDays} dias de racha</Text>
                  )}
                </View>
                {(d.recentActivity ?? []).slice(0, 4).map((a, i) => (
                  <View
                    key={i}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#f3f4f6' }}
                  >
                    <Text style={{ fontSize: 22 }}>{SESSION_ICONS[a.type] ?? '🏅'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                        {SESSION_LABELS[a.type] ?? a.type.toLowerCase().replace(/_/g, ' ')}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 1 }}>
                        {new Date(a.completedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {a.durationMin ? ` · ${a.durationMin} min` : ''}
                      </Text>
                    </View>
                    {a.rpe != null && (
                      <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>RPE {a.rpe}</Text>
                      </View>
                    )}
                  </View>
                ))}
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
