import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { apiFetch } from '../../src/api/client'

const RUN_TYPES = [
  { type: 'RODAJE_Z2',    icon: '🟢', label: 'Rodaje Z2',   sub: 'Ritmo facil — conversacional' },
  { type: 'FARTLEK',      icon: '🟡', label: 'Fartlek',      sub: 'Cambios de ritmo libres' },
  { type: 'TEMPO',        icon: '🟠', label: 'Tempo',        sub: 'Ritmo moderado-alto sostenido' },
  { type: 'INTERVALOS',   icon: '🔴', label: 'Intervalos',   sub: 'Series a alta intensidad' },
  { type: 'TIRADA_LARGA', icon: '🔵', label: 'Tirada larga', sub: 'Distancia larga a ritmo suave' },
  { type: 'OTRO',         icon: '⚪', label: 'Sesion libre', sub: 'Otro tipo de carrera' },
]

type LogPayload = {
  sessionType: string
  completed: boolean
  actualDurationMin?: number
  distanceKm?: number
  rpe?: number
  notes?: string
}

export default function LogRunScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const [runType, setRunType] = useState<string | null>(null)
  const [durationMin, setDurationMin] = useState('45')
  const [distanceKm, setDistanceKm] = useState('')
  const [rpe, setRpe] = useState(0)
  const [notes, setNotes] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(async () => {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['dashboard'] }),
        ])
        router.back()
      }, 1800)
      return () => clearTimeout(timer)
    }
  }, [showSuccess])

  const { mutate: submitLog, isPending } = useMutation({
    mutationFn: (payload: LogPayload) =>
      apiFetch<{ ok: boolean }>('/api/mobile/log/session', { method: 'POST', body: payload }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowSuccess(true)
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message ?? 'No se pudo guardar.')
    },
  })

  function handleSubmit() {
    if (!runType) {
      Alert.alert('Falta dato', 'Elige el tipo de corrida.')
      return
    }
    const parsedDuration = parseInt(durationMin)
    if (!durationMin || isNaN(parsedDuration) || parsedDuration < 1) {
      Alert.alert('Falta dato', 'Ingresa una duracion valida (minimo 1 minuto).')
      return
    }
    const payload: LogPayload = {
      sessionType: runType,
      completed: true,
      actualDurationMin: parsedDuration,
      distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
      rpe: rpe > 0 ? rpe : undefined,
      notes: notes.trim() || undefined,
    }
    submitLog(payload)
  }

  if (showSuccess) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 }}>
        <View style={{
          width: 88, height: 88, borderRadius: 44,
          backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="checkmark" size={48} color="white" />
        </View>
        <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#111827', textAlign: 'center' }}>
          Corrida registrada!
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>
          Tu entrenamiento ha sido guardado correctamente.
        </Text>
        <ActivityIndicator color="#22c55e" style={{ marginTop: 8 }} />
      </View>
    )
  }

  const selectedRun = RUN_TYPES.find(r => r.type === runType)

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
    >
      {/* Header */}
      <LinearGradient
        colors={['#f97316', '#ea6c0a']}
        style={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 16, gap: 12 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Text style={{ fontSize: 36 }}>🏃</Text>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Registro libre
            </Text>
            <Text style={{ color: 'white', fontSize: 20, fontFamily: 'Inter_900Black', letterSpacing: -0.3, marginTop: 2 }}>
              {selectedRun ? selectedRun.label : 'Registrar corrida'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
              {selectedRun ? selectedRun.sub : 'Elige el tipo de corrida'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selector de tipo de corrida */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 }}>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
            Tipo de corrida
          </Text>
          {RUN_TYPES.map(r => (
            <TouchableOpacity
              key={r.type}
              onPress={() => { Haptics.selectionAsync(); setRunType(r.type) }}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
                backgroundColor: runType === r.type ? '#fff7ed' : '#f9fafb',
                borderWidth: 2, borderColor: runType === r.type ? '#f97316' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 20 }}>{r.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: runType === r.type ? '#c2410c' : '#111827' }}>
                  {r.label}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 1 }}>
                  {r.sub}
                </Text>
              </View>
              {runType === r.type && (
                <Ionicons name="checkmark-circle" size={20} color="#f97316" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Duracion y Distancia */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Datos del entrenamiento
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Duracion (min) *</Text>
              <TextInput
                value={durationMin}
                onChangeText={setDurationMin}
                placeholder="45"
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
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Distancia (km)</Text>
              <TextInput
                value={distanceKm}
                onChangeText={setDistanceKm}
                placeholder="8.5"
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

        {/* RPE */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>RPE — Esfuerzo percibido</Text>
            <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#f97316' }}>
              {rpe > 0 ? rpe : '–'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <TouchableOpacity
                key={n}
                onPress={() => { Haptics.selectionAsync(); setRpe(n) }}
                style={{
                  flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: rpe === n ? '#f97316' : (rpe > 0 && n <= rpe ? '#fff7ed' : 'white'),
                  borderWidth: 1, borderColor: rpe >= n ? '#f97316' : '#e5e7eb',
                }}
              >
                <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: rpe === n ? 'white' : (n <= rpe ? '#f97316' : '#9ca3af') }}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>Muy facil</Text>
            <Text style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>Maximo</Text>
          </View>
        </View>

        {/* Notas */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Notas (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Como te sentiste, condiciones, ajustes..."
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
          disabled={isPending}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 18,
            alignItems: 'center', opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Guardar corrida</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
