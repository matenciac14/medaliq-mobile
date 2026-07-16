import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { getCheckinStatus, submitCheckin, acceptSuggestion, rejectSuggestion, type CheckinResult, type CheckinSuggestion } from '../../../src/api/checkin'
import { useAuthStore } from '../../../src/store/auth'
import UpgradeWall from '../../../src/components/UpgradeWall'

type ScaleProps = {
  label: string
  value: number
  onChange: (v: number) => void
  low: string
  high: string
  color?: string
}

function ScaleSelector({ label, value, onChange, low, high, color = '#f97316' }: ScaleProps) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{label}</Text>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color }}>
          {value > 0 ? value : '–'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => {
              Haptics.selectionAsync()
              onChange(n)
            }}
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

export default function CheckinScreen() {
  const { user } = useAuthStore()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const [weight, setWeight] = useState('')
  const [hrResting, setHrResting] = useState('')
  const [sleep, setSleep] = useState('')
  const [energy, setEnergy] = useState(0)
  const [soreness, setSoreness] = useState(0)
  const [stress, setStress] = useState(0)
  const [motivation, setMotivation] = useState(0)
  const [hasPain, setHasPain] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckinResult['adjustment'] | null>(null)
  const [suggestions, setSuggestions] = useState<CheckinSuggestion[]>([])
  const [showMedidas, setShowMedidas] = useState(false)
  const [waist, setWaist] = useState('')
  const [arms, setArms] = useState('')
  const [hips, setHips] = useState('')
  const [thighs, setThighs] = useState('')

  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['checkin-status'],
    queryFn: getCheckinStatus,
    enabled: !!(user?.features?.checkin),
  })

  useFocusEffect(useCallback(() => { refetchStatus() }, [refetchStatus]))

  if (!user?.features?.checkin) {
    return <UpgradeWall icon="📋" title="Check-in semanal" description="Registra tu evolución semanal y recibe ajustes automáticos en tu plan con el plan Pro." />
  }

  async function handleQuickSubmit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setLoading(true)
    try {
      const data = await submitCheckin({ energyLevel: 4, muscleSoreness: 2, stressLevel: 2, painLevel: 0 })
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

  async function handleSubmit() {
    if (energy === 0 || soreness === 0 || stress === 0) {
      Alert.alert('Faltan datos', 'Completa los tres indicadores antes de enviar.')
      return
    }
    setLoading(true)
    try {
      const data = await submitCheckin({
        energyLevel: energy,
        muscleSoreness: soreness,
        stressLevel: stress,
        painLevel: hasPain ? 8 : 0,         // boolean → 1-10 (>=5 activa flag en servidor)
        motivationLevel: motivation > 0 ? motivation * 2 : undefined, // 1-5 → 1-10
        weightKg: weight ? parseFloat(weight) : undefined,
        hrResting: hrResting ? parseInt(hrResting) : undefined,
        sleepHours: sleep ? parseFloat(sleep) : undefined,
        notes: notes.trim() || undefined,
        waistCm: waist ? parseFloat(waist) : undefined,
        armsCm: arms ? parseFloat(arms) : undefined,
        hipsCm: hips ? parseFloat(hips) : undefined,
        thighsCm: thighs ? parseFloat(thighs) : undefined,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      refetchStatus()
      setWeight(''); setHrResting(''); setSleep(''); setEnergy(0); setSoreness(0); setStress(0); setMotivation(0); setHasPain(false); setNotes('')
      setWaist(''); setArms(''); setHips(''); setThighs(''); setShowMedidas(false)
      setResult(data.adjustment ?? null)
      setSuggestions(data.suggestions ?? [])
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar el check-in.')
    } finally {
      setLoading(false)
    }
  }

  // ── Resultado inmediato post-envío ───────────────────────────────
  const TRIGGER_LABELS: Record<string, string> = {
    fc_alta:             'FC reposo elevada',
    sueno_bajo:          'Sueño insuficiente',
    rpe_excesivo:        'RPE alto en fase BASE',
    dolor_activo:        'Dolor / molestias activas',
    energia_baja:        'Energía baja',
    estres_alto:         'Estrés elevado',
    motivacion_baja:     'Motivación muy baja',
    nutricion_baja:      'Adherencia nutricional baja',
    perdida_peso_rapida: 'Pérdida de peso acelerada',
    fatiga_acumulada:    'Fatiga acumulada (múltiples señales)',
  }

  if (result) {
    const hasIssues = result.triggers.length > 0
    const detectedLabels = result.triggers
      .filter(t => t !== 'fatiga_acumulada')
      .map(t => TRIGGER_LABELS[t] ?? t)
    const bannerBg = result.severity === 'critical' ? '#fef2f2' : result.severity === 'warning' ? '#fffbeb' : '#f0fdf4'
    const bannerBorder = result.severity === 'critical' ? '#fecaca' : result.severity === 'warning' ? '#fde68a' : '#bbf7d0'
    const bannerText = result.severity === 'critical' ? '#991b1b' : result.severity === 'warning' ? '#92400e' : '#14532d'
    const icon = result.severity === 'critical' ? '🚨' : result.severity === 'warning' ? '⚠️' : '✅'

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#f1f5f9' }}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 40, paddingHorizontal: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 40 }}>{icon}</Text>
          <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5 }}>
            Check-in guardado
          </Text>
        </View>

        {!hasIssues ? (
          <View style={{ backgroundColor: bannerBg, borderRadius: 16, borderWidth: 1, borderColor: bannerBorder, padding: 18, gap: 4 }}>
            <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: bannerText }}>Todo en orden</Text>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: bannerText, lineHeight: 20 }}>
              Sigue el plan como está — tus métricas están en rango óptimo.
            </Text>
          </View>
        ) : (
          <>
            {/* Lo que detectamos */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, gap: 10 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Lo que detectamos
              </Text>
              {detectedLabels.map((label, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Text style={{ color: '#f59e0b', fontSize: 16, lineHeight: 20 }}>·</Text>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#374151', flex: 1, lineHeight: 20 }}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Lo que ajustamos */}
            {result.adjustments.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4 }}>
                  Lo que ajustamos en tu plan
                </Text>
                {result.adjustments.map((adj, i) => (
                  <View key={i} style={{ backgroundColor: bannerBg, borderRadius: 12, borderWidth: 1, borderColor: bannerBorder, padding: 14, flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: bannerText, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>→</Text>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: bannerText, flex: 1, lineHeight: 20 }}>{adj}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Valores numéricos exactos (CI-F-05) */}
        {(result.planChanges?.volumeDeltaPct !== undefined || result.nutritionChanges?.newKcalHard !== undefined) && (
          <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Valores aplicados
            </Text>
            {result.planChanges?.volumeDeltaPct !== undefined && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>Volumen próxima semana</Text>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: result.planChanges.volumeDeltaPct < 0 ? '#92400e' : '#166534' }}>
                  {result.planChanges.volumeDeltaPct > 0 ? '+' : ''}{result.planChanges.volumeDeltaPct}%
                </Text>
              </View>
            )}
            {result.nutritionChanges?.newKcalHard !== undefined && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>Kcal día intenso</Text>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>{Math.round(result.nutritionChanges.newKcalHard)} kcal</Text>
              </View>
            )}
            {result.nutritionChanges?.newKcalEasy !== undefined && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>Kcal día suave</Text>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>{Math.round(result.nutritionChanges.newKcalEasy)} kcal</Text>
              </View>
            )}
          </View>
        )}

        {/* Sugerencias pendientes (planes COACH) */}
        {suggestions.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4 }}>
              Sugerencias de ajuste
            </Text>
            {suggestions.map((s) => (
              <View key={s.id} style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, gap: 12 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{s.title}</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', lineHeight: 20 }}>{s.description}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => {
                      try {
                        await acceptSuggestion(s.id)
                        setSuggestions(prev => prev.filter(x => x.id !== s.id))
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                      } catch { /* silenciar */ }
                    }}
                    style={{ flex: 1, backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_700Bold' }}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => {
                      try {
                        await rejectSuggestion(s.id)
                        setSuggestions(prev => prev.filter(x => x.id !== s.id))
                      } catch { /* silenciar */ }
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

        {/* CTA */}
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

  // ── Submitted state ─────────────────────────────────────────────
  if (statusLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  if (statusData?.submitted && statusData.data) {
    const d = statusData.data
    const submittedAt = new Date(d.recordedAt).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
    const items = [
      { label: 'Energía',      value: d.energyLevel != null ? `${d.energyLevel}/10` : null },
      { label: 'Estrés',       value: d.stressLevel != null ? `${d.stressLevel}/10` : null },
      { label: 'RPE semana',   value: d.hardestSessionRpe != null ? `${d.hardestSessionRpe}/10` : null },
      { label: 'Motivación',   value: d.motivationLevel != null ? `${d.motivationLevel}/10` : null },
      { label: 'Sueño',        value: d.sleepHours != null ? `${d.sleepHours} h` : null },
      { label: 'Peso',         value: d.weightKg != null ? `${d.weightKg} kg` : null },
      { label: 'FC reposo',    value: d.hrResting != null ? `${d.hrResting} bpm` : null },
    ].filter(i => i.value != null) as { label: string; value: string }[]

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#f1f5f9' }}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40, paddingHorizontal: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5 }}>Check-in</Text>
          <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>Semana {statusData.weekNumber}</Text>
        </View>

        <View style={{ backgroundColor: '#f0fdf4', borderRadius: 20, borderWidth: 1, borderColor: '#bbf7d0', padding: 20, alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 32 }}>✅</Text>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#14532d' }}>Check-in enviado</Text>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#4ade80' }}>{submittedAt}</Text>
        </View>

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
            {d.notes && (
              <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6b7280', marginBottom: 4 }}>Notas</Text>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#374151', lineHeight: 20 }}>{d.notes}</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ backgroundColor: '#f0f9ff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#bae6fd' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#0c4a6e', lineHeight: 20 }}>
            Tu plan se ajustará automáticamente basándose en estos datos. Vuelve el viernes de la próxima semana para el siguiente check-in.
          </Text>
        </View>

        {/* Sugerencias pendientes del check-in anterior */}
        {(statusData?.pendingSuggestions ?? []).length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4 }}>
              Sugerencias de ajuste pendientes
            </Text>
            {(statusData!.pendingSuggestions ?? []).map((s) => (
              <View key={s.id} style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, gap: 12 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{s.title}</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', lineHeight: 20 }}>{s.description}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => {
                      try {
                        await acceptSuggestion(s.id)
                        refetchStatus()
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                      } catch { /* silenciar */ }
                    }}
                    style={{ flex: 1, backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_700Bold' }}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => {
                      try {
                        await rejectSuggestion(s.id)
                        refetchStatus()
                      } catch { /* silenciar */ }
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
      </ScrollView>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40, paddingHorizontal: 16, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View>
          <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5 }}>
            Check-in
          </Text>
          <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
            Cómo vas esta semana · 2 min
          </Text>
        </View>

        {/* Check-in rápido */}
        <TouchableOpacity
          onPress={handleQuickSubmit}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16,
            borderWidth: 1.5, borderColor: '#bbf7d0',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#14532d' }}>
              ¿Semana sin novedades?
            </Text>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#16a34a' }}>
              Energía normal, sin dolores, cumpliste el plan.
            </Text>
          </View>
          {loading
            ? <ActivityIndicator color="#16a34a" />
            : <View style={{
                backgroundColor: '#16a34a', borderRadius: 10,
                paddingHorizontal: 14, paddingVertical: 8, marginLeft: 12,
              }}>
                <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_700Bold' }}>Todo bien →</Text>
              </View>
          }
        </TouchableOpacity>

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
                style={{
                  backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14,
                  paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular',
                  color: '#111827', borderWidth: 1, borderColor: '#e5e7eb',
                }}
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>FC reposo (bpm)</Text>
              <TextInput
                value={hrResting}
                onChangeText={setHrResting}
                placeholder="58"
                placeholderTextColor="#d1d5db"
                keyboardType="number-pad"
                inputMode="numeric"
                style={{
                  backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14,
                  paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular',
                  color: '#111827', borderWidth: 1, borderColor: '#e5e7eb',
                }}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Sueño (h)</Text>
              <TextInput
                value={sleep}
                onChangeText={setSleep}
                placeholder="7.5"
                placeholderTextColor="#d1d5db"
                keyboardType="decimal-pad"
                inputMode="decimal"
                style={{
                  backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14,
                  paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular',
                  color: '#111827', borderWidth: 1, borderColor: '#e5e7eb',
                }}
              />
            </View>
            <View style={{ flex: 1 }} />
          </View>
        </View>

        {/* Medidas corporales */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setShowMedidas(v => !v) }}
            activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}
          >
            <View>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Medidas corporales
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
                Opcional · para seguimiento de progreso
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: '#9ca3af' }}>{showMedidas ? '−' : '+'}</Text>
          </TouchableOpacity>
          {showMedidas && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
              <View style={{ height: 1, backgroundColor: '#f3f4f6', marginBottom: 4 }} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Cintura (cm)</Text>
                  <TextInput
                    value={waist}
                    onChangeText={setWaist}
                    placeholder="80"
                    placeholderTextColor="#d1d5db"
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    style={{
                      backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14,
                      paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular',
                      color: '#111827', borderWidth: 1, borderColor: '#e5e7eb',
                    }}
                  />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Brazos (cm)</Text>
                  <TextInput
                    value={arms}
                    onChangeText={setArms}
                    placeholder="35"
                    placeholderTextColor="#d1d5db"
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    style={{
                      backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14,
                      paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular',
                      color: '#111827', borderWidth: 1, borderColor: '#e5e7eb',
                    }}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Caderas (cm)</Text>
                  <TextInput
                    value={hips}
                    onChangeText={setHips}
                    placeholder="95"
                    placeholderTextColor="#d1d5db"
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    style={{
                      backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14,
                      paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular',
                      color: '#111827', borderWidth: 1, borderColor: '#e5e7eb',
                    }}
                  />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Muslos (cm)</Text>
                  <TextInput
                    value={thighs}
                    onChangeText={setThighs}
                    placeholder="55"
                    placeholderTextColor="#d1d5db"
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    style={{
                      backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14,
                      paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular',
                      color: '#111827', borderWidth: 1, borderColor: '#e5e7eb',
                    }}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Escalas */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 20, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Cómo te sientes
          </Text>
          <ScaleSelector
            label="Energía general"
            value={energy}
            onChange={setEnergy}
            low="Agotado"
            high="Excelente"
            color="#f97316"
          />
          <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />
          <ScaleSelector
            label="Dolor muscular"
            value={soreness}
            onChange={setSoreness}
            low="Sin dolor"
            high="Muy fuerte"
            color="#ef4444"
          />
          <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />
          <ScaleSelector
            label="Estrés / carga mental"
            value={stress}
            onChange={setStress}
            low="Tranquilo"
            high="Muy estresado"
            color="#8b5cf6"
          />
          <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />
          <ScaleSelector
            label="Motivación"
            value={motivation}
            onChange={setMotivation}
            low="Sin ganas"
            high="Muy motivado"
            color="#22c55e"
          />
        </View>

        {/* Molestia o dolor */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Molestia o dolor
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#374151' }}>
            ¿Tuviste alguna molestia física esta semana?
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setHasPain(false) }}
              activeOpacity={0.8}
              style={{
                flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center',
                backgroundColor: !hasPain ? '#22c55e' : 'white',
                borderWidth: 1.5, borderColor: !hasPain ? '#22c55e' : '#e5e7eb',
              }}
            >
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: !hasPain ? 'white' : '#6b7280' }}>
                No
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setHasPain(true) }}
              activeOpacity={0.8}
              style={{
                flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center',
                backgroundColor: hasPain ? '#ef4444' : 'white',
                borderWidth: 1.5, borderColor: hasPain ? '#ef4444' : '#e5e7eb',
              }}
            >
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: hasPain ? 'white' : '#6b7280' }}>
                Sí
              </Text>
            </TouchableOpacity>
          </View>
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
            style={{
              backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
              fontSize: 14, fontFamily: 'Inter_400Regular', color: '#111827',
              borderWidth: 1, borderColor: '#e5e7eb', minHeight: 80,
            }}
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 18,
            alignItems: 'center', opacity: loading ? 0.7 : 1,
          }}
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
