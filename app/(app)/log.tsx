import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { apiFetch } from '../../src/api/client'

const SESSION_ICONS: Record<string, string> = {
  RODAJE_Z2: '🏃', FARTLEK: '🏃', TIRADA_LARGA: '🏃',
  CICLA: '🚴', NATACION: '🏊', FUERZA: '💪', DESCANSO: '😴',
}

type LogPayload = {
  sessionId: string
  completed: boolean
  actualDurationMin?: number
  actualZone?: string
  rpe?: number
  hrAvg?: number
  notes?: string
}

export default function LogScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { sessionId, type, duration, zone } = useLocalSearchParams<{
    sessionId: string
    type: string
    duration: string
    zone: string
  }>()

  const [completed, setCompleted] = useState<boolean | null>(null)
  const [actualDuration, setActualDuration] = useState(duration ?? '')
  const [rpe, setRpe] = useState(0)
  const [hrAvg, setHrAvg] = useState('')
  const [notes, setNotes] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['plan'] })
        router.back()
      }, 1800)
      return () => clearTimeout(timer)
    }
  }, [showSuccess])

  const { mutate: submitLog, isPending } = useMutation({
    mutationFn: (payload: LogPayload) => apiFetch('/api/mobile/log/session', { method: 'POST', body: payload }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowSuccess(true)
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message ?? 'No se pudo guardar.')
    },
  })

  function handleSubmit() {
    if (completed === null) {
      Alert.alert('Falta dato', '¿Completaste la sesión?')
      return
    }
    submitLog({
      sessionId: sessionId!,
      completed,
      actualDurationMin: actualDuration ? parseInt(actualDuration) : undefined,
      rpe: rpe > 0 ? rpe : undefined,
      hrAvg: hrAvg ? parseInt(hrAvg) : undefined,
      notes: notes.trim() || undefined,
    })
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
          ¡Sesión registrada!
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>
          Tu entrenamiento ha sido guardado correctamente.
        </Text>
        <ActivityIndicator color="#22c55e" style={{ marginTop: 8 }} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
    >
      {/* Header */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 16, gap: 12 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Text style={{ fontSize: 36 }}>{SESSION_ICONS[type ?? ''] ?? '🏅'}</Text>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Registrar sesión
            </Text>
            <Text style={{ color: 'white', fontSize: 20, fontFamily: 'Inter_900Black', letterSpacing: -0.3, marginTop: 2 }}>
              {duration} min{zone && zone !== '—' && zone !== '' ? ` · Zona ${zone}` : ''}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
              {(type ?? '').toLowerCase().replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ¿La completaste? */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 12 }}>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
            ¿Completaste la sesión?
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setCompleted(true) }}
              activeOpacity={0.8}
              style={{
                flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
                backgroundColor: completed === true ? '#22c55e' : 'white',
                borderWidth: 2, borderColor: completed === true ? '#22c55e' : '#e5e7eb',
              }}
            >
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: completed === true ? 'white' : '#374151' }}>
                ✓ Sí, la hice
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setCompleted(false) }}
              activeOpacity={0.8}
              style={{
                flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
                backgroundColor: completed === false ? '#ef4444' : 'white',
                borderWidth: 2, borderColor: completed === false ? '#ef4444' : '#e5e7eb',
              }}
            >
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: completed === false ? 'white' : '#374151' }}>
                ✗ No la hice
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {completed && (
          <>
            {/* Duración real */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Datos reales
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Duración real (min)</Text>
                  <TextInput
                    value={actualDuration}
                    onChangeText={setActualDuration}
                    placeholder={duration}
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
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>FC media (bpm)</Text>
                  <TextInput
                    value={hrAvg}
                    onChangeText={setHrAvg}
                    placeholder="148"
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
                <Text style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>Muy fácil</Text>
                <Text style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>Máximo</Text>
              </View>
            </View>
          </>
        )}

        {/* Notas */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Notas (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Cómo te sentiste, condiciones, ajustes..."
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
            : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Guardar sesión</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
