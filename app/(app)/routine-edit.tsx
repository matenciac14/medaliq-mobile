import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { apiFetch } from '../../src/api/client'

type DayActivity = 'REST' | 'GYM' | 'RUN'

const GYM_SPLITS = [
  { value: 'PUSH',      label: 'Push',      sub: 'Pecho, hombros, triceps' },
  { value: 'PULL',      label: 'Pull',      sub: 'Espalda, biceps' },
  { value: 'LEGS',      label: 'Piernas',   sub: 'Cuadriceps, isquios, gemelos' },
  { value: 'FULL_BODY', label: 'Full body', sub: 'Cuerpo completo' },
]

const RUN_TYPES = [
  { value: 'RODAJE_Z2',    icon: '🟢', label: 'Rodaje Z2' },
  { value: 'FARTLEK',      icon: '🟡', label: 'Fartlek' },
  { value: 'TEMPO',        icon: '🟠', label: 'Tempo' },
  { value: 'INTERVALOS',   icon: '🔴', label: 'Intervalos' },
  { value: 'TIRADA_LARGA', icon: '🔵', label: 'Tirada larga' },
  { value: 'OTRO',         icon: '⚪', label: 'Sesion libre' },
]

const DAY_LABELS_FULL = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']
const DAY_LABELS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

type RoutineDay = {
  dow: number          // 1=Lun ... 7=Dom
  activity: DayActivity
  split?: string
  runType?: string
}

const ACTIVITY_CYCLE: DayActivity[] = ['REST', 'GYM', 'RUN']

function cycleActivity(current: DayActivity): DayActivity {
  const idx = ACTIVITY_CYCLE.indexOf(current)
  return ACTIVITY_CYCLE[(idx + 1) % ACTIVITY_CYCLE.length]
}

function buildDefaultDays(): RoutineDay[] {
  return Array.from({ length: 7 }, (_, i) => ({ dow: i + 1, activity: 'REST' as DayActivity }))
}

export default function RoutineEditScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [days, setDays] = useState<RoutineDay[]>(buildDefaultDays())
  const [selectedDow, setSelectedDow] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useFocusEffect(
    useCallback(() => {
      let active = true
      async function load() {
        setIsLoading(true)
        try {
          const res = await apiFetch<{ days: RoutineDay[] } | null>('/api/mobile/routine')
          if (!active) return
          if (res && res.days && res.days.length === 7) {
            setDays(res.days)
          } else {
            setDays(buildDefaultDays())
          }
        } catch {
          if (!active) return
          setDays(buildDefaultDays())
        } finally {
          if (active) setIsLoading(false)
        }
      }
      load()
      return () => { active = false }
    }, [])
  )

  function handleDayPress(dow: number) {
    Haptics.selectionAsync()
    setDays(prev => prev.map(d => {
      if (d.dow !== dow) return d
      const next = cycleActivity(d.activity)
      return { ...d, activity: next, split: undefined, runType: undefined }
    }))
    setSelectedDow(dow)
  }

  function handleSelectDow(dow: number) {
    Haptics.selectionAsync()
    const day = days.find(d => d.dow === dow)
    if (day && day.activity !== 'REST') {
      setSelectedDow(prev => prev === dow ? null : dow)
    } else {
      setSelectedDow(null)
    }
  }

  function handleSetSplit(dow: number, split: string) {
    Haptics.selectionAsync()
    setDays(prev => prev.map(d => d.dow === dow ? { ...d, split } : d))
  }

  function handleSetRunType(dow: number, runType: string) {
    Haptics.selectionAsync()
    setDays(prev => prev.map(d => d.dow === dow ? { ...d, runType } : d))
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const activeDays = days.filter(d => d.activity !== 'REST')
      await apiFetch('/api/mobile/routine', {
        method: 'PUT' as any,
        body: { days, daysPerWeek: activeDays.length },
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar la rutina.')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedDay = selectedDow != null ? days.find(d => d.dow === selectedDow) : null
  const activeDays = days.filter(d => d.activity !== 'REST')

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#1e3a5f" size="large" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 16, gap: 8 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 22, fontFamily: 'Inter_900Black', letterSpacing: -0.3 }}>
          Mi rutina semanal
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontFamily: 'Inter_400Regular' }}>
          Toca cada dia para configurar tu entrenamiento
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Grid de 7 dias */}
        <View style={{
          backgroundColor: 'white', borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: '#e5e7eb', gap: 14,
        }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Toca para cambiar — mantiene para detallar
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {days.map(day => {
              const isSelected = selectedDow === day.dow
              const isGym = day.activity === 'GYM'
              const isRun = day.activity === 'RUN'
              const isRest = day.activity === 'REST'
              const bgColor = isGym ? '#1e3a5f' : isRun ? '#f97316' : '#f1f5f9'
              const labelColor = (isGym || isRun) ? 'white' : '#9ca3af'

              return (
                <View key={day.dow} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
                  <Text style={{
                    fontSize: 10,
                    fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_400Regular',
                    color: isSelected ? '#1e3a5f' : '#9ca3af',
                  }}>
                    {DAY_LABELS_SHORT[day.dow - 1]}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDayPress(day.dow)}
                    onLongPress={() => handleSelectDow(day.dow)}
                    activeOpacity={0.75}
                    style={{
                      width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: bgColor,
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: '#f97316',
                    }}
                  >
                    {isGym && <Text style={{ fontSize: 16 }}>💪</Text>}
                    {isRun && <Text style={{ fontSize: 16 }}>🏃</Text>}
                    {isRest && <Text style={{ fontSize: 14, color: labelColor }}>—</Text>}
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'center' }}>
            Toca para ciclar REST → GYM → RUN  ·  Mantiene para detalles
          </Text>
        </View>

        {/* Panel de detalle */}
        {selectedDay && selectedDay.activity !== 'REST' && (
          <View style={{
            backgroundColor: 'white', borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: '#e5e7eb', gap: 12,
          }}>
            <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
              {DAY_LABELS_FULL[selectedDay.dow - 1]} — {selectedDay.activity === 'GYM' ? 'Gym' : 'Running'}
            </Text>

            {selectedDay.activity === 'GYM' && (
              <>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>
                  Split de entrenamiento
                </Text>
                {GYM_SPLITS.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    onPress={() => handleSetSplit(selectedDay.dow, s.value)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
                      backgroundColor: selectedDay.split === s.value ? '#eff6ff' : '#f9fafb',
                      borderWidth: 2, borderColor: selectedDay.split === s.value ? '#1e3a5f' : 'transparent',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: selectedDay.split === s.value ? '#1e3a5f' : '#374151' }}>
                        {s.label}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 1 }}>
                        {s.sub}
                      </Text>
                    </View>
                    {selectedDay.split === s.value && (
                      <Ionicons name="checkmark-circle" size={18} color="#1e3a5f" />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {selectedDay.activity === 'RUN' && (
              <>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>
                  Tipo de corrida
                </Text>
                {RUN_TYPES.map(r => (
                  <TouchableOpacity
                    key={r.value}
                    onPress={() => handleSetRunType(selectedDay.dow, r.value)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
                      backgroundColor: selectedDay.runType === r.value ? '#fff7ed' : '#f9fafb',
                      borderWidth: 2, borderColor: selectedDay.runType === r.value ? '#f97316' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{r.icon}</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold', color: selectedDay.runType === r.value ? '#c2410c' : '#374151' }}>
                      {r.label}
                    </Text>
                    {selectedDay.runType === r.value && (
                      <Ionicons name="checkmark-circle" size={18} color="#f97316" />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}

        {/* Resumen */}
        {activeDays.length > 0 && (
          <View style={{
            backgroundColor: 'white', borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: '#e5e7eb', gap: 8,
          }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Resumen — {activeDays.length} dia{activeDays.length !== 1 ? 's' : ''} activo{activeDays.length !== 1 ? 's' : ''}
            </Text>
            {activeDays.map(day => {
              const isGym = day.activity === 'GYM'
              const split = GYM_SPLITS.find(s => s.value === day.split)
              const runType = RUN_TYPES.find(r => r.value === day.runType)
              return (
                <View
                  key={day.dow}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}
                >
                  <View style={{
                    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isGym ? '#1e3a5f' : '#f97316',
                  }}>
                    <Text style={{ fontSize: 14 }}>{isGym ? '💪' : '🏃'}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151', width: 80 }}>
                    {DAY_LABELS_FULL[day.dow - 1]}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>
                    {isGym
                      ? (split ? split.label : 'Sin split definido')
                      : (runType ? `${runType.icon} ${runType.label}` : 'Sin tipo definido')
                    }
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* CTA Guardar */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#1e3a5f', borderRadius: 14, paddingVertical: 18,
            alignItems: 'center', opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Guardar rutina</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
