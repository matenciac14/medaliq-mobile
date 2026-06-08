import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Modal, Animated, Vibration,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { getTodayGymSession, completeGymSession, SetLog, GymSessionData } from '../../src/api/gym'

type LocalSet = {
  workoutExerciseId: string
  setNumber: number
  weightKg: string
  repsCompleted: string
  completed: boolean
}

function buildInitialSets(data: GymSessionData): LocalSet[] {
  const sets: LocalSet[] = []
  for (const ex of data.exercises) {
    for (let i = 1; i <= ex.sets; i++) {
      const prev = ex.previousLogs.find(l => l.setNumber === i)
      sets.push({
        workoutExerciseId: ex.id,
        setNumber: i,
        weightKg: prev?.weightKg ? String(prev.weightKg) : '',
        repsCompleted: '',
        completed: false,
      })
    }
  }
  return sets
}

// Rest Timer Modal
function RestTimerModal({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          Vibration.vibrate([0, 300, 100, 300])
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          onDone()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [])

  const progress = remaining / seconds
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <Modal transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, alignItems: 'center', gap: 20 }}>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
            Descanso
          </Text>
          <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#f97316', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff7ed' }}>
            <Text style={{ fontSize: 36, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
              {mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onDone}
            style={{ backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 }}
          >
            <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Saltar descanso</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default function GymSessionScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const [sets, setSets] = useState<LocalSet[]>([])
  const [restTimer, setRestTimer] = useState<{ show: boolean; seconds: number }>({ show: false, seconds: 90 })
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0)
  const startTimeRef = useRef(Date.now())

  const { data: session, isLoading } = useQuery({
    queryKey: ['gym-today'],
    queryFn: getTodayGymSession,
  })

  useEffect(() => {
    if (session) {
      setSets(buildInitialSets(session))
    }
  }, [session])

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const { mutate: finishSession, isPending: finishing } = useMutation({
    mutationFn: completeGymSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gym-today'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message ?? 'No se pudo guardar la sesión.')
    },
  })

  function updateSet(idx: number, field: 'weightKg' | 'repsCompleted', value: string) {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  function markSetDone(idx: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, completed: true } : s))
    // Start rest timer
    const ex = session!.exercises.find(e => e.id === sets[idx].workoutExerciseId)
    const restSeconds = ex?.restSeconds ?? 90
    setRestTimer({ show: true, seconds: restSeconds })
  }

  function handleFinish() {
    const completedCount = sets.filter(s => s.completed).length
    if (completedCount === 0) {
      Alert.alert('Sin sets', 'Completa al menos un set antes de finalizar.')
      return
    }

    Alert.alert('Finalizar sesión', `Completaste ${completedCount} sets. ¿Guardar?`, [
      { text: 'Seguir', style: 'cancel' },
      {
        text: 'Guardar', style: 'default',
        onPress: () => {
          const setLogs: SetLog[] = sets
            .filter(s => s.completed)
            .map(s => ({
              workoutExerciseId: s.workoutExerciseId,
              setNumber: s.setNumber,
              weightKg: s.weightKg ? parseFloat(s.weightKg) : null,
              repsCompleted: s.repsCompleted ? parseInt(s.repsCompleted) : null,
              completed: true,
            }))
          finishSession({
            assignedWorkoutId: session!.assignedWorkoutId,
            dayOfWeek: new Date().getDay(),
            setLogs,
            durationMin: Math.round(elapsedSecs / 60),
          })
        },
      },
    ])
  }

  const elapsedMins = Math.floor(elapsedSecs / 60)
  const elapsedSecsRem = elapsedSecs % 60

  if (isLoading || !session) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>⏳</Text>
        <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Cargando sesión...</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {restTimer.show && (
        <RestTimerModal
          seconds={restTimer.seconds}
          onDone={() => setRestTimer({ show: false, seconds: 90 })}
        />
      )}

      {/* Top bar */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="chevron-down" size={24} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {session.workoutDay?.label}
          </Text>
          <Text style={{ color: 'white', fontSize: 22, fontFamily: 'Inter_900Black', letterSpacing: -0.5, marginTop: 2 }}>
            {`${elapsedMins.toString().padStart(2, '0')}:${elapsedSecsRem.toString().padStart(2, '0')}`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleFinish}
          disabled={finishing}
          style={{ backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_700Bold' }}>
            {finishing ? '...' : 'Finalizar'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Exercise tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', maxHeight: 52 }}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 4, alignItems: 'center' }}
      >
        {session.exercises.map((ex, i) => {
          const exSets = sets.filter(s => s.workoutExerciseId === ex.id)
          const done = exSets.filter(s => s.completed).length
          const total = exSets.length
          const isActive = i === activeExerciseIdx
          return (
            <TouchableOpacity
              key={ex.id}
              onPress={() => setActiveExerciseIdx(i)}
              style={{
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
                backgroundColor: isActive ? '#1e3a5f' : 'transparent',
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: isActive ? 'white' : '#6b7280' }}>
                {i + 1}
              </Text>
              {done > 0 && (
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: done === total ? '#22c55e' : '#f97316', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 8, color: 'white', fontFamily: 'Inter_700Bold' }}>{done}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Active exercise */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {session.exercises[activeExerciseIdx] && (() => {
          const ex = session.exercises[activeExerciseIdx]
          const exSets = sets.filter(s => s.workoutExerciseId === ex.id)
          const exSetIdxOffset = sets.findIndex(s => s.workoutExerciseId === ex.id)

          return (
            <View style={{ gap: 12 }}>
              {/* Exercise header */}
              <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 4 }}>
                <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.3 }}>
                  {ex.exercise.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular' }}>
                  {ex.sets} series · {ex.repsScheme}
                  {ex.restSeconds ? ` · ${ex.restSeconds}s descanso` : ''}
                </Text>
                {ex.exercise.muscleGroups.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {ex.exercise.muscleGroups.map(mg => (
                      <View key={mg} style={{ backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>{mg}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {ex.exercise.tips && (
                  <Text style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'Inter_400Regular', marginTop: 4, fontStyle: 'italic' }}>
                    💡 {ex.exercise.tips}
                  </Text>
                )}
              </View>

              {/* Column headers */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
                <Text style={{ width: 32, fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase' }}>Set</Text>
                <Text style={{ flex: 1, fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>Kg</Text>
                <Text style={{ flex: 1, fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>Reps</Text>
                <View style={{ width: 56 }} />
              </View>

              {/* Sets */}
              {exSets.map((set, localIdx) => {
                const globalIdx = exSetIdxOffset + localIdx
                return (
                  <View
                    key={`${ex.id}-${set.setNumber}`}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      backgroundColor: set.completed ? '#f0fdf4' : 'white',
                      borderRadius: 12, padding: 10,
                      borderWidth: 1.5,
                      borderColor: set.completed ? '#86efac' : '#e5e7eb',
                    }}
                  >
                    <View style={{ width: 28, alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: set.completed ? '#22c55e' : '#374151' }}>
                        {set.setNumber}
                      </Text>
                    </View>
                    <TextInput
                      value={set.weightKg}
                      onChangeText={v => updateSet(globalIdx, 'weightKg', v)}
                      placeholder="—"
                      placeholderTextColor="#d1d5db"
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      editable={!set.completed}
                      style={{
                        flex: 1, height: 44, textAlign: 'center', fontSize: 18,
                        fontFamily: 'Inter_700Bold', color: '#111827',
                        backgroundColor: set.completed ? 'transparent' : '#f9fafb',
                        borderRadius: 8, borderWidth: set.completed ? 0 : 1, borderColor: '#e5e7eb',
                      }}
                    />
                    <TextInput
                      value={set.repsCompleted}
                      onChangeText={v => updateSet(globalIdx, 'repsCompleted', v)}
                      placeholder="—"
                      placeholderTextColor="#d1d5db"
                      keyboardType="number-pad"
                      inputMode="numeric"
                      editable={!set.completed}
                      style={{
                        flex: 1, height: 44, textAlign: 'center', fontSize: 18,
                        fontFamily: 'Inter_700Bold', color: '#111827',
                        backgroundColor: set.completed ? 'transparent' : '#f9fafb',
                        borderRadius: 8, borderWidth: set.completed ? 0 : 1, borderColor: '#e5e7eb',
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => !set.completed && markSetDone(globalIdx)}
                      style={{
                        width: 44, height: 44, borderRadius: 10,
                        backgroundColor: set.completed ? '#22c55e' : '#f97316',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={set.completed ? 'checkmark' : 'checkmark-outline'} size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                )
              })}

              {/* Navigate exercises */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                {activeExerciseIdx > 0 && (
                  <TouchableOpacity
                    onPress={() => setActiveExerciseIdx(i => i - 1)}
                    style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>← Anterior</Text>
                  </TouchableOpacity>
                )}
                {activeExerciseIdx < session.exercises.length - 1 && (
                  <TouchableOpacity
                    onPress={() => setActiveExerciseIdx(i => i + 1)}
                    style={{ flex: 1, backgroundColor: '#1e3a5f', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: 'white' }}>Siguiente →</Text>
                  </TouchableOpacity>
                )}
                {activeExerciseIdx === session.exercises.length - 1 && (
                  <TouchableOpacity
                    onPress={handleFinish}
                    style={{ flex: 1, backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: 'white' }}>Finalizar sesión ✓</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        })()}
      </ScrollView>
    </View>
  )
}
