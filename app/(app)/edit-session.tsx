import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { apiFetch } from '../../src/api/client'

const SESSION_ICONS: Record<string, string> = {
  RODAJE_Z2: '🏃', FARTLEK: '🏃', TIRADA_LARGA: '🏃', TEMPO: '🏃',
  INTERVALOS: '⚡', SIMULACRO: '🏁', TEST: '📊',
  CICLA: '🚴', NATACION: '🏊', FUERZA: '💪', DESCANSO: '😴', OTRO: '🏅',
}

const SESSION_TYPE_OPTIONS = [
  { value: 'RODAJE_Z2',    label: 'Rodaje Z2' },
  { value: 'FARTLEK',      label: 'Fartlek' },
  { value: 'TEMPO',        label: 'Tempo' },
  { value: 'INTERVALOS',   label: 'Intervalos' },
  { value: 'TIRADA_LARGA', label: 'Tirada Larga' },
  { value: 'FUERZA',       label: 'Fuerza' },
  { value: 'CICLA',        label: 'Cicla' },
  { value: 'NATACION',     label: 'Natación' },
  { value: 'SIMULACRO',    label: 'Simulacro' },
  { value: 'DESCANSO',     label: 'Descanso' },
  { value: 'OTRO',         label: 'Otro' },
]

export default function EditSessionScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const {
    sessionId, type: initialType, duration: initialDuration,
    zone: initialZone, detail: initialDetail,
    logId, logDuration: initialLogDuration,
    logRpe: initialLogRpe, logHrAvg: initialLogHrAvg,
    logNotes: initialLogNotes,
  } = useLocalSearchParams<{
    sessionId: string; type: string; duration: string
    zone: string; detail: string
    logId?: string; logDuration?: string
    logRpe?: string; logHrAvg?: string; logNotes?: string
  }>()

  const isLogged = !!logId

  // Planned fields
  const [type, setType]         = useState(initialType ?? 'RODAJE_Z2')
  const [duration, setDuration] = useState(initialDuration ?? '')
  const [zone, setZone]         = useState(initialZone ?? '')
  const [detail, setDetail]     = useState(initialDetail ?? '')

  // Log fields
  const [logDuration, setLogDuration] = useState(initialLogDuration ?? '')
  const [rpe, setRpe]                 = useState(parseInt(initialLogRpe ?? '0') || 0)
  const [hrAvg, setHrAvg]             = useState(initialLogHrAvg ?? '')
  const [logNotes, setLogNotes]       = useState(initialLogNotes ?? '')

  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      const sessionUpdates: Record<string, unknown> = {}
      if (type !== initialType) sessionUpdates.type = type
      if (duration && parseInt(duration) !== parseInt(initialDuration ?? '0')) sessionUpdates.durationMin = parseInt(duration)
      if (zone !== initialZone) sessionUpdates.zoneTarget = zone
      if (detail !== initialDetail) sessionUpdates.detailText = detail

      const logUpdates: Record<string, unknown> = {}
      if (isLogged) {
        if (logDuration) logUpdates.durationMin = parseInt(logDuration)
        if (rpe > 0) logUpdates.rpe = rpe
        if (hrAvg) logUpdates.hrAvg = parseInt(hrAvg)
        logUpdates.notes = logNotes.trim() || null
      }

      const requests: Promise<unknown>[] = []
      if (Object.keys(sessionUpdates).length > 0) {
        requests.push(apiFetch(`/api/mobile/sessions/${sessionId}`, { method: 'PATCH', body: sessionUpdates }))
      }
      if (isLogged && Object.keys(logUpdates).length > 0) {
        requests.push(apiFetch(`/api/mobile/log/session/${logId}`, { method: 'PATCH', body: logUpdates }))
      }

      await Promise.all(requests)

      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['plan'] }),
        queryClient.refetchQueries({ queryKey: ['dashboard'] }),
      ])
      router.back()
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar.')
    } finally {
      setLoading(false)
    }
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
          <Text style={{ fontSize: 32 }}>{SESSION_ICONS[type] ?? '🏅'}</Text>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Editar sesión
            </Text>
            <Text style={{ color: 'white', fontSize: 18, fontFamily: 'Inter_900Black', letterSpacing: -0.3, marginTop: 2 }}>
              {duration} min{zone && zone !== '—' ? ` · ${zone}` : ''}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Sesión planificada ── */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 14 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Sesión planificada
          </Text>

          {/* Tipo de sesión */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Tipo de sesión</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                {SESSION_TYPE_OPTIONS.map(o => (
                  <TouchableOpacity
                    key={o.value}
                    onPress={() => { Haptics.selectionAsync(); setType(o.value) }}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: type === o.value ? '#1e3a5f' : '#f1f5f9',
                      borderWidth: 1, borderColor: type === o.value ? '#1e3a5f' : '#e5e7eb',
                    }}
                  >
                    <Text style={{
                      fontSize: 12, fontFamily: 'Inter_600SemiBold',
                      color: type === o.value ? 'white' : '#374151',
                    }}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Duración + Zona */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Duración (min)</Text>
              <TextInput
                value={duration}
                onChangeText={setDuration}
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
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Zona objetivo</Text>
              <TextInput
                value={zone}
                onChangeText={setZone}
                placeholder="Z2, Z3-Z4…"
                placeholderTextColor="#d1d5db"
                style={{
                  backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14,
                  paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular',
                  color: '#111827', borderWidth: 1, borderColor: '#e5e7eb',
                }}
              />
            </View>
          </View>

          {/* Descripción */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Descripción / estructura</Text>
            <TextInput
              value={detail}
              onChangeText={setDetail}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="Describe la sesión…"
              placeholderTextColor="#d1d5db"
              style={{
                backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                fontSize: 14, fontFamily: 'Inter_400Regular', color: '#111827',
                borderWidth: 1, borderColor: '#e5e7eb', minHeight: 80,
              }}
            />
          </View>
        </View>

        {/* ── Registro ── */}
        {isLogged && (
          <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 14 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Registro de sesión
            </Text>

            {/* Duración real + FC */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Duración real (min)</Text>
                <TextInput
                  value={logDuration}
                  onChangeText={setLogDuration}
                  placeholder={initialDuration}
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

            {/* RPE */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>RPE — Esfuerzo percibido</Text>
                <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#f97316' }}>
                  {rpe > 0 ? rpe : '–'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => { Haptics.selectionAsync(); setRpe(rpe === n ? 0 : n) }}
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
            </View>

            {/* Notas */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>Notas</Text>
              <TextInput
                value={logNotes}
                onChangeText={setLogNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholder="Cómo te sentiste, condiciones…"
                placeholderTextColor="#d1d5db"
                style={{
                  backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 14, fontFamily: 'Inter_400Regular', color: '#111827',
                  borderWidth: 1, borderColor: '#e5e7eb', minHeight: 72,
                }}
              />
            </View>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#1e3a5f', borderRadius: 14, paddingVertical: 18,
            alignItems: 'center', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Guardar cambios</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
