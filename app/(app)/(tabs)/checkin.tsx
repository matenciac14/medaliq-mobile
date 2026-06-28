import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { getCheckinStatus, submitCheckin } from '../../../src/api/checkin'
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
      await submitCheckin({ energyLevel: 4, muscleSoreness: 2, stressLevel: 2, painLevel: 0 })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      refetchStatus()
      Alert.alert('¡Listo!', 'Check-in registrado. Tu plan se ajustará esta semana.')
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
      await submitCheckin({
        energyLevel: energy,
        muscleSoreness: soreness,
        stressLevel: stress,
        painLevel: hasPain ? 8 : 0,         // boolean → 1-10 (>=5 activa flag en servidor)
        motivationLevel: motivation > 0 ? motivation * 2 : undefined, // 1-5 → 1-10
        weightKg: weight ? parseFloat(weight) : undefined,
        hrResting: hrResting ? parseInt(hrResting) : undefined,
        sleepHours: sleep ? parseFloat(sleep) : undefined,
        notes: notes.trim() || undefined,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      refetchStatus()
      Alert.alert('¡Listo!', 'Check-in registrado. Tu plan se ajustará esta semana.')
      // Reset
      setWeight(''); setHrResting(''); setSleep(''); setEnergy(0); setSoreness(0); setStress(0); setMotivation(0); setHasPain(false); setNotes('')
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar el check-in.')
    } finally {
      setLoading(false)
    }
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
