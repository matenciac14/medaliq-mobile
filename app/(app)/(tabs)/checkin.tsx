import { useState, useCallback, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { getCheckinStatus, submitCheckin, acceptSuggestion, rejectSuggestion, type CheckinResult, type CheckinSuggestion } from '../../../src/api/checkin'
import { useAuthStore } from '../../../src/store/auth'
import UpgradeWall from '../../../src/components/UpgradeWall'
import { isSyncEnabled, queryRestingHeartRate, querySleepHours } from '../../../src/services/healthkit.service'

// ── Slider component (1–10) ────────────────────────────────────────────────

type SliderProps = {
  label: string
  value: number
  onChange: (v: number) => void
  max?: number
  color: string
  unit?: string
  helperText?: string
}

function MetricSlider({ label, value, onChange, max = 10, color, unit, helperText }: SliderProps) {
  const pct = value > 0 ? ((value - 1) / (max - 1)) * 100 : 0

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{label}</Text>
          {helperText && (
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#71808e', marginTop: 1 }}>{helperText}</Text>
          )}
        </View>
        {value > 0 ? (
          <View style={{ backgroundColor: '#f5f7fa', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 12 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color }}>{value}{unit ? ` ${unit}` : ''}</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: '#b3b3b3' }}>—</Text>
        )}
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: '#e6e6e6', position: 'relative', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: value > 0 ? `${pct}%` : '0%',
            backgroundColor: color, borderRadius: 3,
          }}
        />
        {/* Invisible range input area — tap zones */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: -16, bottom: -16, flexDirection: 'row' }}>
          {Array.from({ length: max }, (_, i) => (
            <TouchableOpacity
              key={i}
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => { Haptics.selectionAsync(); onChange(i + 1) }}
            />
          ))}
        </View>
        {/* Custom thumb */}
        {value > 0 && (
          <View
            style={{
              position: 'absolute',
              left: `${pct}%`,
              marginLeft: -7,
              width: 14, height: 14, borderRadius: 7,
              backgroundColor: 'white',
              borderWidth: 2, borderColor: color,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2,
              elevation: 2,
            }}
          />
        )}
      </View>
    </View>
  )
}

// ── Adherence day squares ───────────────────────────────────────────────────

const DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'] as const
const DAY_DOW = [1, 2, 3, 4, 5, 6, 0] // dayOfWeek mapping

type AdherenceDayProps = {
  weekSessions: { dayOfWeek: number; completed: boolean }[]
}

function AdherenceDays({ weekSessions }: AdherenceDayProps) {
  const total = weekSessions.length
  const completed = weekSessions.filter(s => s.completed).length

  return (
    <View style={{ gap: 6 }}>
      <View style={{ height: 1, backgroundColor: '#e5ecf2' }} />
      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#99a6b2' }}>Adherencia al plan</Text>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#6f859a' }}>
        {completed} de {total} sesiones completadas esta semana
      </Text>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
        {DAYS.map((day, i) => {
          const dow = DAY_DOW[i]
          const session = weekSessions.find(s => s.dayOfWeek === dow)
          const hasSession = !!session
          const done = session?.completed ?? false

          const bg = !hasSession ? '#e5ecf2' : done ? '#22c35d' : 'rgba(234,88,9,0.18)'
          const textColor = !hasSession ? '#6f859a' : done ? 'white' : '#ea5809'

          return (
            <View
              key={day}
              style={{
                flex: 1, height: 44, borderRadius: 10,
                backgroundColor: bg,
                alignItems: 'center', justifyContent: 'center', gap: 2,
              }}
            >
              <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: textColor }}>{day}</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: textColor }}>
                {!hasSession ? '\u2014' : done ? '\u2713' : '\u2717'}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ── Trigger labels ──────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  fc_alta:             'FC reposo elevada',
  sueno_bajo:          'Sueno insuficiente',
  rpe_excesivo:        'RPE alto en fase BASE',
  dolor_activo:        'Dolor / molestias activas',
  energia_baja:        'Energia baja',
  estres_alto:         'Estres elevado',
  motivacion_baja:     'Motivacion muy baja',
  nutricion_baja:      'Adherencia nutricional baja',
  perdida_peso_rapida: 'Perdida de peso acelerada',
  fatiga_acumulada:    'Fatiga acumulada (multiples senales)',
}

// ── Pain level options ──────────────────────────────────────────────────────

const PAIN_OPTIONS = [
  { label: 'Sin molestias', value: 0 },
  { label: 'Leve', value: 3 },
  { label: 'Moderada', value: 7 },
] as const

// ── Main screen ─────────────────────────────────────────────────────────────

export default function CheckinScreen() {
  const { user } = useAuthStore()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  // Form state — all scales 1–10
  const [energy, setEnergy] = useState(0)
  const [stress, setStress] = useState(0)
  const [motivation, setMotivation] = useState(0)
  const [sleepHours, setSleepHours] = useState('')
  const [weight, setWeight] = useState('')
  const [hrResting, setHrResting] = useState('')
  const [nutritionAdherence, setNutritionAdherence] = useState(0)
  const [painLevel, setPainLevel] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckinResult['adjustment'] | null>(null)
  const [suggestions, setSuggestions] = useState<CheckinSuggestion[]>([])
  const [hkPrefilled, setHkPrefilled] = useState<{ hr: boolean; sleep: boolean }>({ hr: false, sleep: false })

  // HealthKit pre-fill
  useEffect(() => {
    if (Platform.OS !== 'ios') return
    ;(async () => {
      try {
        const enabled = await isSyncEnabled()
        if (!enabled) return
        const [hr, sleep] = await Promise.all([queryRestingHeartRate(), querySleepHours()])
        if (hr) { setHrResting(hr.toString()); setHkPrefilled(p => ({ ...p, hr: true })) }
        if (sleep) { setSleepHours(sleep.toString()); setHkPrefilled(p => ({ ...p, sleep: true })) }
      } catch { /* HealthKit not available */ }
    })()
  }, [])

  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['checkin-status'],
    queryFn: getCheckinStatus,
    enabled: !!(user?.features?.checkin),
  })

  useFocusEffect(useCallback(() => { refetchStatus() }, [refetchStatus]))

  // Derived
  const weekSessions = statusData?.weekSessions ?? []
  const adherencePct = useMemo(() => {
    if (weekSessions.length === 0) return null
    const completed = weekSessions.filter(s => s.completed).length
    return Math.round((completed / weekSessions.length) * 100)
  }, [weekSessions])

  if (!user?.features?.checkin) {
    return <UpgradeWall icon="clipboard" title="Check-in semanal" description="Registra tu evolucion semanal y recibe ajustes automaticos en tu plan con el plan Pro." />
  }

  async function handleSubmit() {
    if (energy === 0 || stress === 0) {
      Alert.alert('Faltan datos', 'Completa al menos energia y estres antes de enviar.')
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setLoading(true)
    try {
      const data = await submitCheckin({
        energyLevel: energy,
        muscleSoreness: energy, // RPE auto — use energy as proxy when no auto RPE available
        stressLevel: stress,
        motivationLevel: motivation > 0 ? motivation : undefined,
        painLevel: painLevel ?? 0,
        weightKg: weight ? parseFloat(weight) : undefined,
        hrResting: hrResting ? parseInt(hrResting) : undefined,
        sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
        nutritionAdherencePct: nutritionAdherence > 0 ? nutritionAdherence * 10 : undefined,
        notes: notes.trim() || undefined,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      refetchStatus()
      setResult(data.adjustment ?? null)
      setSuggestions(data.suggestions ?? [])
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar el check-in.')
    } finally {
      setLoading(false)
    }
  }

  // ── Result screen (post-submit) ─────────────────────────────────────────

  if (result) {
    const hasIssues = result.triggers.length > 0
    const detectedLabels = result.triggers
      .filter(t => t !== 'fatiga_acumulada')
      .map(t => TRIGGER_LABELS[t] ?? t)
    const bannerBg = result.severity === 'critical' ? '#fef2f2' : result.severity === 'warning' ? '#fffbeb' : '#f0fdf4'
    const bannerBorder = result.severity === 'critical' ? '#fecaca' : result.severity === 'warning' ? '#fde68a' : '#bbf7d0'
    const bannerText = result.severity === 'critical' ? '#991b1b' : result.severity === 'warning' ? '#92400e' : '#14532d'
    const icon = result.severity === 'critical' ? '!' : result.severity === 'warning' ? '!' : ''

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#f8fafc' }}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 40, paddingHorizontal: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: result.severity === 'critical' ? '#ef4444' : result.severity === 'warning' ? '#f59e0b' : '#22c35d',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 24, color: 'white', fontFamily: 'Inter_700Bold' }}>
              {result.severity === 'ok' ? '\u2713' : icon}
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5 }}>
            Check-in guardado
          </Text>
        </View>

        {!hasIssues ? (
          <View style={{ backgroundColor: bannerBg, borderRadius: 16, borderWidth: 1, borderColor: bannerBorder, padding: 18, gap: 4 }}>
            <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: bannerText }}>Todo en orden</Text>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: bannerText, lineHeight: 20 }}>
              Sigue el plan como esta — tus metricas estan en rango optimo.
            </Text>
          </View>
        ) : (
          <>
            <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, gap: 10 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Lo que detectamos
              </Text>
              {detectedLabels.map((label, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Text style={{ color: '#f59e0b', fontSize: 16, lineHeight: 20 }}>{'\u00b7'}</Text>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#374151', flex: 1, lineHeight: 20 }}>{label}</Text>
                </View>
              ))}
            </View>

            {result.adjustments.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4 }}>
                  Lo que ajustamos en tu plan
                </Text>
                {result.adjustments.map((adj, i) => (
                  <View key={i} style={{ backgroundColor: bannerBg, borderRadius: 12, borderWidth: 1, borderColor: bannerBorder, padding: 14, flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: bannerText, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{'\u2192'}</Text>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: bannerText, flex: 1, lineHeight: 20 }}>{adj}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4 }}>
              Sugerencias de ajuste
            </Text>
            {suggestions.map(s => (
              <View key={s.id} style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, gap: 12 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{s.title}</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', lineHeight: 20 }}>{s.description}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => {
                      try { await acceptSuggestion(s.id); setSuggestions(prev => prev.filter(x => x.id !== s.id)); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {}
                    }}
                    style={{ flex: 1, backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_700Bold' }}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => {
                      try { await rejectSuggestion(s.id); setSuggestions(prev => prev.filter(x => x.id !== s.id)) } catch {}
                    }}
                    style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' }}
                  >
                    <Text style={{ color: '#6b7280', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => { setResult(null); setSuggestions([]) }}
          activeOpacity={0.85}
          style={{ backgroundColor: '#1e3a5f', borderRadius: 14, paddingVertical: 18, alignItems: 'center' }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (statusLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator color="#ea5809" size="large" />
      </View>
    )
  }

  // ── Submitted state ──────────────────────────────────────────────────────

  if (statusData?.submitted && statusData.data) {
    const d = statusData.data
    const submittedAt = new Date(d.recordedAt).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
    const items = [
      { label: 'Energia',      value: d.energyLevel != null ? `${d.energyLevel}/10` : null },
      { label: 'Estres',       value: d.stressLevel != null ? `${d.stressLevel}/10` : null },
      { label: 'RPE semana',   value: d.hardestSessionRpe != null ? `${d.hardestSessionRpe}/10` : null },
      { label: 'Motivacion',   value: d.motivationLevel != null ? `${d.motivationLevel}/10` : null },
      { label: 'Sueno',        value: d.sleepHours != null ? `${d.sleepHours} h` : null },
      { label: 'Peso',         value: d.weightKg != null ? `${d.weightKg} kg` : null },
      { label: 'FC reposo',    value: d.hrResting != null ? `${d.hrResting} bpm` : null },
    ].filter(i => i.value != null) as { label: string; value: string }[]

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#f8fafc' }}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40, paddingHorizontal: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5 }}>Check-in</Text>
          {statusData.totalWeeks && (
            <View style={{ backgroundColor: '#22c35d', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: 'white' }}>
                SEMANA {statusData.weekNumber} DE {statusData.totalWeeks}
              </Text>
            </View>
          )}
        </View>

        {/* Success card */}
        <View style={{ backgroundColor: '#f0fdf4', borderRadius: 20, borderWidth: 1, borderColor: '#bbf7d0', padding: 20, alignItems: 'center', gap: 8 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#22c35d', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, color: 'white', fontFamily: 'Inter_700Bold' }}>{'\u2713'}</Text>
          </View>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#14532d' }}>Check-in enviado</Text>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#4ade80' }}>{submittedAt}</Text>
        </View>

        {/* Data summary */}
        {items.length > 0 && (
          <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 2, borderWidth: 1, borderColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Datos registrados
            </Text>
            {items.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#f3f4f6' }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#374151' }}>{item.label}</Text>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Pending suggestions */}
        {(statusData?.pendingSuggestions ?? []).length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4 }}>
              Sugerencias pendientes
            </Text>
            {(statusData!.pendingSuggestions ?? []).map(s => (
              <View key={s.id} style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, gap: 12 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{s.title}</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', lineHeight: 20 }}>{s.description}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => { try { await acceptSuggestion(s.id); refetchStatus(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch {} }}
                    style={{ flex: 1, backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_700Bold' }}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => { try { await rejectSuggestion(s.id); refetchStatus() } catch {} }}
                    style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' }}
                  >
                    <Text style={{ color: '#6b7280', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ backgroundColor: '#f0f9ff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#bae6fd' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#0c4a6e', lineHeight: 20 }}>
            Tu plan se ajustara automaticamente basandose en estos datos.
          </Text>
        </View>
      </ScrollView>
    )
  }

  // ── Main form — matches Figma mobile check-in (3567:49) ──────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HEADER (navy) ──────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: '#1e3a5f',
          paddingTop: insets.top + 16, paddingBottom: 16, paddingHorizontal: 16, gap: 8,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 24, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>
              Revision Semanal
            </Text>
            {statusData?.totalWeeks && (
              <View style={{ backgroundColor: '#22c35d', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: 'white' }}>
                  SEMANA {statusData.weekNumber} DE {statusData.totalWeeks}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)' }}>
            Evalua tu semana y ajusta el plan
          </Text>

          {/* Week adherence summary */}
          {weekSessions.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' }}>
                {weekSessions.filter(s => s.completed).length}/{weekSessions.length} sesiones completadas
              </Text>
              {/* Progress bar */}
              <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <View style={{
                  height: 4, borderRadius: 2, backgroundColor: '#22c35d',
                  width: `${adherencePct ?? 0}%`,
                }} />
              </View>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.6)' }}>
                {adherencePct}% adherencia{' '}
                {adherencePct != null && (adherencePct >= 80 ? '\u00b7 sigue bien' : adherencePct >= 50 ? '\u00b7 puedes mejorar' : '\u00b7 animo, sigamos')}
              </Text>
            </View>
          )}
        </View>

        {/* ── AUTO-DATA BANNER ────────────────────────────────────────────── */}
        {statusData?.hasAutoData && (
          <View style={{
            backgroundColor: '#fff3e0', paddingHorizontal: 16, paddingVertical: 12,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={{ width: 3, height: 32, borderRadius: 2, backgroundColor: '#ea5809' }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>
                  Datos pre-llenados automaticamente
                </Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6f859a', marginTop: 1 }}>
                  Sesiones: {weekSessions.filter(s => s.completed).length}/{weekSessions.length}
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: 'rgba(34,195,93,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#22c35d' }}>Auto {'\u2713'}</Text>
            </View>
          </View>
        )}

        {/* ── DATOS AUTOMATICOS section ──────────────────────────────────── */}
        <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 16, paddingVertical: 16, gap: 12 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#106f33', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            DATOS AUTOMATICOS {'\u2713'}
          </Text>

          {/* RPE — auto from session data */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>RPE mas duro de la semana</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6f859a', marginTop: 1 }}>
                  Ajusta el RPE de tu sesion mas dura
                </Text>
              </View>
              <View style={{
                width: 36, height: 36, borderRadius: 8,
                backgroundColor: '#ea5809',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: 'white' }}>
                  {statusData?.data?.hardestSessionRpe ?? '—'}
                </Text>
              </View>
            </View>
            {/* RPE slider placeholder — filled from session logs */}
            <View style={{ height: 6, borderRadius: 3, backgroundColor: '#e6e6e6' }}>
              <View style={{
                height: 6, borderRadius: 3, backgroundColor: '#ea5809',
                width: statusData?.data?.hardestSessionRpe ? `${((statusData.data.hardestSessionRpe - 1) / 9) * 100}%` : '0%',
              }} />
            </View>
          </View>

          {/* Adherence days */}
          {weekSessions.length > 0 && <AdherenceDays weekSessions={weekSessions} />}
        </View>

        {/* ── COMPLETA TU separator ──────────────────────────────────────── */}
        <View style={{ backgroundColor: '#f5f7fa', paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6f859a', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            COMPLETA TU
          </Text>
        </View>

        {/* ── FORM FIELDS ────────────────────────────────────────────────── */}
        <View style={{ backgroundColor: 'white', paddingHorizontal: 16 }}>
          {/* Horas de sueno */}
          <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5ecf2' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>Horas de sueno</Text>
              <TextInput
                value={sleepHours}
                onChangeText={(v) => { setSleepHours(v); setHkPrefilled(p => ({ ...p, sleep: false })) }}
                placeholder="7.5"
                placeholderTextColor="#d1d5db"
                keyboardType="decimal-pad"
                inputMode="decimal"
                style={{
                  backgroundColor: hkPrefilled.sleep ? '#fff1f2' : '#f5f7fa',
                  borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
                  fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1e3a5f',
                  width: 90, textAlign: 'center',
                  borderWidth: hkPrefilled.sleep ? 1 : 0, borderColor: '#fecdd3',
                }}
              />
            </View>
            {sleepHours ? (
              <View style={{ height: 6, borderRadius: 3, backgroundColor: '#e6e6e6' }}>
                <View style={{
                  height: 6, borderRadius: 3,
                  backgroundColor: 'rgba(30,58,95,0.45)',
                  width: `${Math.min(100, (parseFloat(sleepHours) / 10) * 100)}%`,
                }} />
              </View>
            ) : null}
            {hkPrefilled.sleep && (
              <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#ef4444', marginTop: 4 }}>
                Apple Health
              </Text>
            )}
          </View>

          {/* Nivel de estres */}
          <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5ecf2' }}>
            <MetricSlider
              label="Nivel de estres"
              value={stress}
              onChange={setStress}
              color="#1e3a5f"
            />
          </View>

          {/* Nivel de motivacion */}
          <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5ecf2' }}>
            <MetricSlider
              label="Nivel de motivacion"
              value={motivation}
              onChange={setMotivation}
              color="#ea5809"
            />
          </View>

          {/* Energia general */}
          <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5ecf2' }}>
            <MetricSlider
              label="Energia general"
              value={energy}
              onChange={setEnergy}
              color="#1e3a5f"
              helperText="Como fue tu energia esta semana? (1-10)"
            />
          </View>

          {/* FC reposo */}
          <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5ecf2' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>FC reposo (bpm)</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#8fa3bc', marginTop: 1 }}>
                  Frecuencia cardiaca al despertar
                </Text>
              </View>
              <TextInput
                value={hrResting}
                onChangeText={(v) => { setHrResting(v); setHkPrefilled(p => ({ ...p, hr: false })) }}
                placeholder="60"
                placeholderTextColor="#d1d5db"
                keyboardType="number-pad"
                inputMode="numeric"
                style={{
                  backgroundColor: hkPrefilled.hr ? '#fff1f2' : '#f5f7fa',
                  borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
                  fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1e3a5f',
                  width: 90, textAlign: 'center',
                  borderWidth: hkPrefilled.hr ? 1 : 0, borderColor: '#fecdd3',
                }}
              />
            </View>
            {hkPrefilled.hr && (
              <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#ef4444', marginTop: 4 }}>
                Apple Health
              </Text>
            )}
          </View>

          {/* Peso actual */}
          <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5ecf2' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>Peso actual</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="72.5"
                placeholderTextColor="#d1d5db"
                keyboardType="decimal-pad"
                inputMode="decimal"
                style={{
                  backgroundColor: '#f5f7fa', borderRadius: 10,
                  paddingHorizontal: 12, paddingVertical: 6,
                  fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1e3a5f',
                  width: 90, textAlign: 'center',
                }}
              />
            </View>
          </View>

          {/* Adherencia nutricional */}
          <View style={{ paddingVertical: 16 }}>
            <MetricSlider
              label="Adherencia nutricional"
              value={nutritionAdherence}
              onChange={setNutritionAdherence}
              color="#1e3a5f"
            />
          </View>
        </View>

        {/* ── MOLESTIAS section ──────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 10 }}>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>Alguna molestia?</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PAIN_OPTIONS.map(opt => {
              const selected = painLevel === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { Haptics.selectionAsync(); setPainLevel(opt.value) }}
                  activeOpacity={0.8}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
                    backgroundColor: selected ? '#1e3a5f' : 'white',
                    borderWidth: 1.5, borderColor: selected ? '#1e3a5f' : '#1e3a5f',
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontFamily: 'Inter_600SemiBold',
                    color: selected ? 'white' : '#1e3a5f',
                  }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* ── NOTES ──────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Algo que tu coach deba saber? (opcional)"
            placeholderTextColor="#b3b3b3"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            style={{
              backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
              fontSize: 14, fontFamily: 'Inter_400Regular', color: '#111827',
              borderWidth: 1, borderColor: '#e5e7eb', minHeight: 56,
            }}
          />
        </View>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24, gap: 12, paddingBottom: 20 }}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#ea5809', borderRadius: 14, paddingVertical: 18,
              alignItems: 'center', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>
                  Enviar revision semanal {'\u2192'}
                </Text>
            }
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>Saltar por ahora</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
