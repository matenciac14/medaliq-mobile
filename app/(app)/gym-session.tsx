import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Modal, Vibration, ActivityIndicator, Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import {
  getTodayGymSession, completeGymSession, searchExercises,
  SetLog, GymSessionData, PRResult, ExerciseOverride, ExerciseSearchResult,
} from '../../src/api/gym'
import { saveDraft, loadDraft, clearDraft, savePendingSync, loadPendingSync, clearPendingSync } from '../../src/store/gymSessionDraft'

const MOBILE_SUPERSET_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  SUPERSET: { bg: '#ede9fe', text: '#7c3aed', label: 'Superset' },
  BISERIE:  { bg: '#e0e7ff', text: '#4338ca', label: 'Biserie'  },
  DROPSET:  { bg: '#ffe4e6', text: '#e11d48', label: 'Drop Set' },
}

type LocalSet = {
  workoutExerciseId: string
  setNumber: number
  weightKg: string
  repsCompleted: string
  completed: boolean
  setLogType: 'WORK' | 'WARMUP' | 'DROPSET'
}

type FreeExercise = {
  localId: string
  name: string
  gif?: string | null
}

let _nextLocalId = 1
function newLocalId() { return `free-${_nextLocalId++}` }

const SET_TYPE_CONFIG = {
  WORK:    { bg: 'transparent', text: '#374151', badge: null },
  WARMUP:  { bg: '#fff7ed',     text: '#f97316', badge: 'W' },
  DROPSET: { bg: '#ffe4e6',     text: '#e11d48', badge: '↓' },
} as const

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
        setLogType: 'WORK',
      })
    }
  }
  return sets
}

// Exercise Swap Modal
function SwapModal({
  visible,
  originalName,
  defaultBodyPart,
  onSwap,
  onClose,
}: {
  visible: boolean
  originalName: string
  defaultBodyPart: string
  onSwap: (result: ExerciseSearchResult) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<ExerciseSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  // Reset on close
  useEffect(() => {
    if (!visible) { setQ(''); setResults([]) }
  }, [visible])

  // Debounced search
  useEffect(() => {
    if (!visible) return
    setLoading(true)
    const timer = setTimeout(() => {
      searchExercises({ q: q || undefined, bodyPart: defaultBodyPart || undefined, limit: 25 })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [q, visible, defaultBodyPart])

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>Sustituir ejercicio</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 2 }} numberOfLines={1}>
                Reemplazando: {originalName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, gap: 8 }}>
              <Ionicons name="search" size={16} color="#9ca3af" />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Buscar ejercicio..."
                placeholderTextColor="#9ca3af"
                autoFocus
                style={{ flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#111827' }}
              />
              {q.length > 0 && (
                <TouchableOpacity onPress={() => setQ('')}>
                  <Ionicons name="close-circle" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Results */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ paddingHorizontal: 16 }}
            contentContainerStyle={{ paddingBottom: 32, gap: 8 }}
          >
            {loading && (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator color="#f97316" />
              </View>
            )}
            {!loading && results.length === 0 && (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>Sin resultados</Text>
              </View>
            )}
            {results.map(r => (
              <TouchableOpacity
                key={r.id}
                onPress={() => onSwap(r)}
                style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', gap: 4, marginBottom: 8 }}
              >
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{r.nameEs ?? r.name}</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#3b82f6' }}>{r.bodyPart}</Text>
                  </View>
                  <View style={{ backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#16a34a' }}>{r.target}</Text>
                  </View>
                  {r.equipment && (
                    <View style={{ backgroundColor: '#faf5ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#7c3aed' }}>{r.equipment}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// Add Exercise Modal (free session) — EX-12 / sesión auto-dirigida
function AddExerciseModal({
  visible,
  onAdd,
  onClose,
}: {
  visible: boolean
  onAdd: (result: ExerciseSearchResult) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<ExerciseSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) { setQ(''); setResults([]) }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    const timer = setTimeout(() => {
      searchExercises({ q: q || undefined, limit: 30 })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [q, visible])

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 17, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>Agregar ejercicio</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, gap: 8 }}>
              <Ionicons name="search" size={16} color="#9ca3af" />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Buscar ejercicio..."
                placeholderTextColor="#9ca3af"
                autoFocus
                style={{ flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#111827' }}
              />
              {q.length > 0 && (
                <TouchableOpacity onPress={() => setQ('')}>
                  <Ionicons name="close-circle" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 32, gap: 8 }}>
            {loading && <View style={{ padding: 24, alignItems: 'center' }}><ActivityIndicator color="#f97316" /></View>}
            {!loading && results.length === 0 && (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                  {q.length === 0 ? 'Escribe para buscar...' : 'Sin resultados'}
                </Text>
              </View>
            )}
            {results.map(r => (
              <TouchableOpacity
                key={r.id}
                onPress={() => onAdd(r)}
                style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}
              >
                {r.gif ? (
                  <Image source={{ uri: r.gif }} style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#f3f4f6' }} resizeMode="contain" />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="barbell" size={20} color="#d1d5db" />
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{r.nameEs ?? r.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#3b82f6' }}>{r.bodyPart}</Text>
                    </View>
                    <View style={{ backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#16a34a' }}>{r.target}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ backgroundColor: '#f97316', borderRadius: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={18} color="white" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// Finish Session Modal
function FinishModal({
  visible,
  completedCount,
  defaultDuration,
  onConfirm,
  onClose,
  submitting,
}: {
  visible: boolean
  completedCount: number
  defaultDuration: number
  onConfirm: (rpe: number, durationMin: number, notes: string) => void
  onClose: () => void
  submitting: boolean
}) {
  const [rpe, setRpe] = useState(7)
  const [durationMin, setDurationMin] = useState(String(defaultDuration || 60))
  const [notes, setNotes] = useState('')

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 20 }}>
          <View>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -0.3 }}>Finalizar sesión</Text>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 2 }}>
              {completedCount} series completadas
            </Text>
          </View>

          {/* RPE */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Esfuerzo (RPE)</Text>
              <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#f97316' }}>{rpe}/10</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setRpe(n)}
                  style={{
                    flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: rpe === n ? '#f97316' : '#f3f4f6',
                  }}
                >
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: rpe === n ? 'white' : '#6b7280' }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>Muy fácil</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>Máximo esfuerzo</Text>
            </View>
          </View>

          {/* Duration */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Duración (minutos)</Text>
            <TextInput
              value={durationMin}
              onChangeText={setDurationMin}
              keyboardType="number-pad"
              style={{
                borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
                paddingHorizontal: 14, paddingVertical: 12,
                fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#111827',
              }}
            />
          </View>

          {/* Notes */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Notas (opcional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="¿Alguna observación?"
              placeholderTextColor="#d1d5db"
              multiline
              numberOfLines={2}
              style={{
                borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
                paddingHorizontal: 14, paddingVertical: 12,
                fontSize: 14, fontFamily: 'Inter_400Regular', color: '#111827',
                minHeight: 64, textAlignVertical: 'top',
              }}
            />
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(rpe, parseInt(durationMin) || 60, notes)}
              disabled={submitting}
              style={{ flex: 2, backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: 'white' }}>
                {submitting ? 'Guardando...' : 'Guardar sesión'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
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

  function adjustTime(delta: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setRemaining(prev => Math.max(5, prev + delta))
  }

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
          {/* Adjust timer */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => adjustTime(-15)}
              style={{ backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#374151' }}>−15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => adjustTime(+15)}
              style={{ backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#374151' }}>+15s</Text>
            </TouchableOpacity>
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

// PR Celebration Modal
function PRModal({ prs, onClose }: { prs: PRResult[]; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 28, width: '100%', alignItems: 'center', gap: 16 }}>
          <Text style={{ fontSize: 48 }}>🏆</Text>
          <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -0.4, textAlign: 'center' }}>
            ¡Nuevo récord personal!
          </Text>
          <View style={{ width: '100%', gap: 8 }}>
            {prs.map((pr, i) => (
              <View key={i} style={{ backgroundColor: '#fff7ed', borderRadius: 12, borderWidth: 1, borderColor: '#fed7aa', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 20 }}>💪</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#9a3412' }}>
                    {pr.exerciseName ?? 'Ejercicio'}
                  </Text>
                  {pr.weightKg != null && (
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#c2410c', marginTop: 2 }}>
                      {pr.weightKg} kg — tu mejor marca
                    </Text>
                  )}
                </View>
                <View style={{ backgroundColor: '#f97316', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: 'white', letterSpacing: 0.5 }}>PR</Text>
                </View>
              </View>
            ))}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{ backgroundColor: '#1e3a5f', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 4 }}
          >
            <Text style={{ color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>¡Genial! 🎉</Text>
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
  const [freeExercises, setFreeExercises] = useState<FreeExercise[]>([])
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [restTimer, setRestTimer] = useState<{ show: boolean; seconds: number }>({ show: false, seconds: 90 })
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [prResults, setPrResults] = useState<PRResult[]>([])
  const [swapTarget, setSwapTarget] = useState<{ workoutExerciseId: string; bodyPart: string; originalName: string } | null>(null)
  const [exerciseOverrides, setExerciseOverrides] = useState<Map<string, { id: string; name: string }>>(new Map())
  const startTimeRef = useRef(Date.now())
  const draftRestoredRef = useRef(false)
  const lastPayloadRef = useRef<Parameters<typeof completeGymSession>[0] | null>(null)

  const { data: session, isLoading } = useQuery({
    queryKey: ['gym-today'],
    queryFn: getTodayGymSession,
  })

  // Restore draft or build fresh sets when session loads
  useEffect(() => {
    if (!session || draftRestoredRef.current) return
    draftRestoredRef.current = true
    const sessionKey = session.assignedWorkoutId ?? session.plannedSessionId ?? 'unknown'
    loadDraft(sessionKey).then(draft => {
      if (draft) {
        setSets(draft.sets.map(s => ({ ...s, setLogType: (s.setLogType as LocalSet['setLogType']) ?? 'WORK' })))
      } else {
        setSets(buildInitialSets(session))
      }
    }).catch(() => {
      setSets(buildInitialSets(session))
    })
  }, [session])

  // Check for pending sync from a previous failed submission and retry silently
  useEffect(() => {
    loadPendingSync().then(async pending => {
      if (!pending) return
      try {
        await completeGymSession(pending.payload)
        await clearPendingSync()
        await clearDraft(pending.sessionKey)
        Alert.alert('Sesión sincronizada', 'Tu sesión anterior se guardó correctamente.')
      } catch {
        // Still offline — keep pending sync for next time
      }
    }).catch(() => {})
  }, [])

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const { mutate: finishSession, isPending: finishing } = useMutation({
    mutationFn: completeGymSession,
    onSuccess: (data) => {
      const sessionKey = session?.assignedWorkoutId ?? session?.plannedSessionId ?? 'unknown'
      clearDraft(sessionKey).catch(() => {})
      clearPendingSync().catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['gym-today'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['gym-history'] })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowFinishModal(false)
      if (data.newPRs.length > 0) {
        setPrResults(data.newPRs)
      } else {
        router.back()
      }
    },
    onError: (err: any) => {
      const isOffline = !('statusCode' in err)
      if (isOffline && session && lastPayloadRef.current) {
        const sessionKey = session.assignedWorkoutId ?? session.plannedSessionId ?? 'unknown'
        savePendingSync(sessionKey, lastPayloadRef.current).catch(() => {})
        setShowFinishModal(false)
        Alert.alert(
          'Sin conexión',
          'Tu sesión se guardó localmente y se enviará cuando vuelvas a conectarte.',
          [{ text: 'OK', onPress: () => router.back() }]
        )
      } else {
        Alert.alert('Error', err.message ?? 'No se pudo guardar la sesión.')
      }
    },
  })

  function cycleSetType(idx: number) {
    const ORDER: LocalSet['setLogType'][] = ['WORK', 'WARMUP', 'DROPSET']
    setSets(prev => {
      const next = prev.map((s, i) => {
        if (i !== idx) return s
        const curr = ORDER.indexOf(s.setLogType)
        return { ...s, setLogType: ORDER[(curr + 1) % ORDER.length] }
      })
      if (session) {
        const key = session.assignedWorkoutId ?? session.plannedSessionId ?? 'unknown'
        saveDraft(key, next).catch(() => {})
      }
      return next
    })
  }

  function handleSwap(result: ExerciseSearchResult) {
    if (!swapTarget) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setExerciseOverrides(prev => {
      const next = new Map(prev)
      next.set(swapTarget.workoutExerciseId, { id: result.id, name: result.nameEs ?? result.name })
      return next
    })
    setSwapTarget(null)
  }

  function addFreeExercise(result: ExerciseSearchResult) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const localId = newLocalId()
    const fe: FreeExercise = { localId, name: result.nameEs ?? result.name, gif: result.gif ?? null }
    setFreeExercises(prev => [...prev, fe])
    // Pre-add one blank set for this exercise
    setSets(prev => [...prev, {
      workoutExerciseId: localId,
      setNumber: 1,
      weightKg: '',
      repsCompleted: '',
      completed: false,
      setLogType: 'WORK',
    }])
    setActiveExerciseIdx(freeExercises.length) // focus new exercise tab
    setShowAddExercise(false)
  }

  function addFreeSet(localId: string) {
    setSets(prev => {
      const existingSets = prev.filter(s => s.workoutExerciseId === localId)
      return [...prev, {
        workoutExerciseId: localId,
        setNumber: existingSets.length + 1,
        weightKg: '',
        repsCompleted: '',
        completed: false,
        setLogType: 'WORK',
      }]
    })
  }

  function updateSet(idx: number, field: 'weightKg' | 'repsCompleted', value: string) {
    setSets(prev => {
      const next = prev.map((s, i) => i === idx ? { ...s, [field]: value } : s)
      if (session) {
        const key = session.assignedWorkoutId ?? session.plannedSessionId ?? 'unknown'
        saveDraft(key, next).catch(() => {})
      }
      return next
    })
  }

  function markSetDone(idx: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSets(prev => {
      const next = prev.map((s, i) => i === idx ? { ...s, completed: true } : s)
      if (session) {
        const key = session.assignedWorkoutId ?? session.plannedSessionId ?? 'unknown'
        saveDraft(key, next).catch(() => {})
      }
      return next
    })
    // Start rest timer
    const ex = session!.exercises.find(e => e.id === sets[idx].workoutExerciseId)
    const restSeconds = ex?.restSeconds ?? 90
    setRestTimer({ show: true, seconds: restSeconds })
  }

  function handleFinish() {
    const completedCount = sets.filter(s => s.completed).length
    if (session?.freeSession && freeExercises.length === 0) {
      Alert.alert('Sin ejercicios', 'Agrega al menos un ejercicio antes de finalizar.')
      return
    }
    if (completedCount === 0) {
      Alert.alert('Sin sets', 'Completa al menos un set antes de finalizar.')
      return
    }
    setShowFinishModal(true)
  }

  function handleConfirmFinish(rpe: number, durationMin: number, notes: string) {
    const completedSets: SetLog[] = session!.freeSession
      ? sets.map(s => {
          const fe = freeExercises.find(f => f.localId === s.workoutExerciseId)
          return {
            exerciseName: fe?.name ?? s.workoutExerciseId,
            setNumber: s.setNumber,
            weightKg: s.weightKg ? parseFloat(s.weightKg) : null,
            repsCompleted: s.repsCompleted ? parseInt(s.repsCompleted) : null,
            completed: s.completed,
            setLogType: s.setLogType,
          }
        })
      : sets.map(s => ({
          workoutExerciseId: s.workoutExerciseId,
          setNumber: s.setNumber,
          weightKg: s.weightKg ? parseFloat(s.weightKg) : null,
          repsCompleted: s.repsCompleted ? parseInt(s.repsCompleted) : null,
          completed: s.completed,
          setLogType: s.setLogType,
        }))
    const overridesArr: ExerciseOverride[] = session!.exercises
      .filter(ex => exerciseOverrides.has(ex.id))
      .map(ex => {
        const ov = exerciseOverrides.get(ex.id)!
        return {
          originalWorkoutExerciseId: ex.id,
          replacedWithExerciseId: ov.id,
          replacedExerciseName: ov.name,
        }
      })
    const payload = {
      ...(session!.plannedSessionId
        ? { plannedSessionId: session!.plannedSessionId }
        : { assignedWorkoutId: session!.assignedWorkoutId! }),
      dayOfWeek: session!.dayOfWeek,
      sets: completedSets,
      durationMin,
      rpe,
      notes: notes.trim() || undefined,
      exerciseOverrides: overridesArr.length > 0 ? overridesArr : undefined,
    }
    lastPayloadRef.current = payload
    finishSession(payload)
  }

  const elapsedMins = Math.floor(elapsedSecs / 60)
  const elapsedSecsRem = elapsedSecs % 60

  if (isLoading || !session) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>⏳</Text>
        <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Cargando sesión...</Text>
      </View>
    )
  }

  const completedCount = sets.filter(s => s.completed).length

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {prResults.length > 0 && (
        <PRModal prs={prResults} onClose={() => { setPrResults([]); router.back() }} />
      )}
      {restTimer.show && (
        <RestTimerModal
          seconds={restTimer.seconds}
          onDone={() => setRestTimer({ show: false, seconds: 90 })}
        />
      )}
      <FinishModal
        visible={showFinishModal}
        completedCount={completedCount}
        defaultDuration={Math.max(1, Math.round(elapsedSecs / 60))}
        onConfirm={handleConfirmFinish}
        onClose={() => setShowFinishModal(false)}
        submitting={finishing}
      />
      {swapTarget && (
        <SwapModal
          visible
          originalName={swapTarget.originalName}
          defaultBodyPart={swapTarget.bodyPart}
          onSwap={handleSwap}
          onClose={() => setSwapTarget(null)}
        />
      )}
      <AddExerciseModal
        visible={showAddExercise}
        onAdd={addFreeExercise}
        onClose={() => setShowAddExercise(false)}
      />

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
        {(session.freeSession ? freeExercises.map((fe, i) => ({ id: fe.localId, label: String(i + 1), sets: sets.filter(s => s.workoutExerciseId === fe.localId) })) : session.exercises.map((ex, i) => ({ id: ex.id, label: String(i + 1), sets: sets.filter(s => s.workoutExerciseId === ex.id), setType: ex.setType }))).map((item, i) => {
          const done = item.sets.filter(s => s.completed).length
          const total = item.sets.length
          const isActive = i === activeExerciseIdx
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setActiveExerciseIdx(i)}
              style={{
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
                backgroundColor: isActive ? '#1e3a5f' : 'transparent',
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: isActive ? 'white' : '#6b7280' }}>
                {item.label}
              </Text>
              {done > 0 && (
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: done === total ? '#22c55e' : '#f97316', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 8, color: 'white', fontFamily: 'Inter_700Bold' }}>{done}</Text>
                </View>
              )}
              {(item as any).setType && (item as any).setType !== 'NORMAL' && !!MOBILE_SUPERSET_STYLES[(item as any).setType] && (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: MOBILE_SUPERSET_STYLES[(item as any).setType].text }} />
              )}
            </TouchableOpacity>
          )
        })}
        {session.freeSession && (
          <TouchableOpacity
            onPress={() => setShowAddExercise(true)}
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff7ed', flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="add" size={14} color="#f97316" />
            <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#f97316' }}>Agregar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Active exercise */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Free session empty state */}
        {session.freeSession && freeExercises.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 48, gap: 16 }}>
            <Text style={{ fontSize: 48 }}>💪</Text>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 17, fontFamily: 'Inter_900Black', color: '#1e3a5f', textAlign: 'center' }}>
                Sesión libre
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 }}>
                Agrega los ejercicios que vas a hacer hoy.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowAddExercise(true)}
              style={{ backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Ionicons name="add-circle" size={18} color="white" />
              <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: 'white' }}>Agregar ejercicio</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Free session exercise content */}
        {session.freeSession && freeExercises[activeExerciseIdx] && (() => {
          const fe = freeExercises[activeExerciseIdx]
          const exSets = sets.filter(s => s.workoutExerciseId === fe.localId)
          const exSetIdxOffset = sets.findIndex(s => s.workoutExerciseId === fe.localId)
          return (
            <View style={{ gap: 12 }}>
              {/* Free exercise header */}
              <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 }}>
                <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.3 }}>{fe.name}</Text>
                {fe.gif ? (
                  <Image source={{ uri: fe.gif }} style={{ width: '100%', height: 140, borderRadius: 10, backgroundColor: '#f3f4f6' }} resizeMode="contain" />
                ) : null}
              </View>
              {/* Column headers */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
                <Text style={{ width: 32, fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase' }}>Set</Text>
                <Text style={{ flex: 1, fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>Kg</Text>
                <Text style={{ flex: 1, fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>Reps</Text>
                <View style={{ width: 56 }} />
              </View>
              {exSets.map((set, localIdx) => {
                const globalIdx = exSetIdxOffset + localIdx
                return (
                  <View key={`${fe.localId}-${set.setNumber}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: set.completed ? '#f0fdf4' : 'white', borderRadius: 12, padding: 10, borderWidth: 1.5, borderColor: set.completed ? '#86efac' : '#e5e7eb' }}>
                    <TouchableOpacity onPress={() => !set.completed && cycleSetType(globalIdx)} disabled={set.completed} style={{ width: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: set.completed ? 'transparent' : SET_TYPE_CONFIG[set.setLogType].bg, borderRadius: 8, paddingVertical: 2, minHeight: 44, gap: 1 }}>
                      <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: set.completed ? '#22c55e' : SET_TYPE_CONFIG[set.setLogType].text }}>{set.setNumber}</Text>
                      {!set.completed && SET_TYPE_CONFIG[set.setLogType].badge && (
                        <Text style={{ fontSize: 8, fontFamily: 'Inter_700Bold', color: SET_TYPE_CONFIG[set.setLogType].text }}>{SET_TYPE_CONFIG[set.setLogType].badge}</Text>
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <TextInput value={set.weightKg} onChangeText={v => updateSet(globalIdx, 'weightKg', v)} placeholder="—" placeholderTextColor="#d1d5db" keyboardType="decimal-pad" editable={!set.completed} style={{ width: '100%', height: 44, textAlign: 'center', fontSize: 18, fontFamily: 'Inter_700Bold', color: '#111827', backgroundColor: set.completed ? 'transparent' : '#f9fafb', borderRadius: 8, borderWidth: set.completed ? 0 : 1, borderColor: '#e5e7eb' }} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <TextInput value={set.repsCompleted} onChangeText={v => updateSet(globalIdx, 'repsCompleted', v)} placeholder="—" placeholderTextColor="#d1d5db" keyboardType="number-pad" editable={!set.completed} style={{ width: '100%', height: 44, textAlign: 'center', fontSize: 18, fontFamily: 'Inter_700Bold', color: '#111827', backgroundColor: set.completed ? 'transparent' : '#f9fafb', borderRadius: 8, borderWidth: set.completed ? 0 : 1, borderColor: '#e5e7eb' }} />
                    </View>
                    <TouchableOpacity onPress={() => !set.completed && markSetDone(globalIdx)} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: set.completed ? '#22c55e' : '#f97316', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={set.completed ? 'checkmark' : 'checkmark-outline'} size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                )
              })}
              <TouchableOpacity onPress={() => addFreeSet(fe.localId)} style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                <Ionicons name="add" size={16} color="#6b7280" />
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>Agregar set</Text>
              </TouchableOpacity>
            </View>
          )
        })()}

        {session.exercises[activeExerciseIdx] && !session.freeSession && (() => {
          const ex = session.exercises[activeExerciseIdx]
          const exSets = sets.filter(s => s.workoutExerciseId === ex.id)
          const exSetIdxOffset = sets.findIndex(s => s.workoutExerciseId === ex.id)

          const swappedEx = exerciseOverrides.get(ex.id)
          const hasCompletedSets = sets.filter(s => s.workoutExerciseId === ex.id && s.completed).length > 0

          return (
            <View style={{ gap: 12 }}>
              {/* Warmup note — only on first exercise */}
              {activeExerciseIdx === 0 && session.workoutDay?.warmupNotes && (
                <View style={{ backgroundColor: '#fff7ed', borderRadius: 12, borderWidth: 1, borderColor: '#fed7aa', padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 14 }}>🔥</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#c2410c', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>Calentamiento</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9a3412', lineHeight: 18 }}>{session.workoutDay.warmupNotes}</Text>
                  </View>
                </View>
              )}

              {/* Exercise header */}
              <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: swappedEx ? '#bfdbfe' : '#e5e7eb', gap: 4 }}>
                {/* Name row + Sustituir button */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.3 }}>
                      {swappedEx ? swappedEx.name : ex.exercise.name}
                    </Text>
                    {swappedEx && (
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>
                        Antes: {ex.exercise.name}
                      </Text>
                    )}
                  </View>
                  {!hasCompletedSets && (
                    <TouchableOpacity
                      onPress={() => setSwapTarget({
                        workoutExerciseId: ex.id,
                        bodyPart: ex.exercise.bodyPart ?? '',
                        originalName: ex.exercise.name,
                      })}
                      style={{ backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Ionicons name="swap-horizontal" size={13} color="#3b82f6" />
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#3b82f6' }}>Sustituir</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular' }}>
                  {ex.sets} series · {ex.repsScheme}
                  {ex.restSeconds ? ` · ${ex.restSeconds}s descanso` : ''}
                </Text>

                {/* Muscle group badges */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  <View style={{ backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#3b82f6' }}>{ex.exercise.target}</Text>
                  </View>
                  <View style={{ backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>{ex.exercise.bodyPart}</Text>
                  </View>
                  {ex.exercise.mechanic ? (
                    <View style={{ backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#16a34a' }}>{ex.exercise.mechanic}</Text>
                    </View>
                  ) : null}
                </View>

                {/* GIF demo — EX-11: guía visual del movimiento */}
                {!swappedEx && ex.exercise.gif ? (
                  <Image
                    source={{ uri: ex.exercise.gif }}
                    style={{ width: '100%', height: 160, borderRadius: 10, backgroundColor: '#f3f4f6', marginTop: 8 }}
                    resizeMode="contain"
                  />
                ) : null}

                {ex.setType && ex.setType !== 'NORMAL' && MOBILE_SUPERSET_STYLES[ex.setType] && (
                  <View style={{ backgroundColor: MOBILE_SUPERSET_STYLES[ex.setType].bg, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: MOBILE_SUPERSET_STYLES[ex.setType].text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      ↕ {MOBILE_SUPERSET_STYLES[ex.setType].label}
                    </Text>
                  </View>
                )}
                {!swappedEx && ex.exercise.description && (
                  <Text style={{ fontSize: 12, color: '#4b5563', fontFamily: 'Inter_400Regular', marginTop: 4, lineHeight: 18 }}>
                    {ex.exercise.description}
                  </Text>
                )}
                {ex.notes && (
                  <View style={{ backgroundColor: '#fef9c3', borderRadius: 8, padding: 8, marginTop: 6 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#713f12' }}>📋 {ex.notes}</Text>
                  </View>
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
                const prevLog = ex.previousLogs.find(l => l.setNumber === set.setNumber)

                const currentWeight = set.weightKg !== '' ? parseFloat(set.weightKg) : null
                const currentReps = set.repsCompleted !== '' ? parseInt(set.repsCompleted) : null
                const weightDelta = prevLog?.weightKg != null && currentWeight != null
                  ? Math.round((currentWeight - prevLog.weightKg) * 10) / 10
                  : null
                const repsDelta = prevLog?.repsCompleted != null && currentReps != null
                  ? currentReps - prevLog.repsCompleted
                  : null

                function deltaColor(delta: number | null) {
                  if (delta == null) return '#9ca3af'
                  if (delta > 0) return '#22c55e'
                  if (delta < 0) return '#ef4444'
                  return '#9ca3af'
                }
                function deltaLabel(delta: number | null, prev: number | null, unit: string) {
                  if (delta != null) return delta > 0 ? `+${delta}${unit}` : delta < 0 ? `${delta}${unit}` : `=${prev}${unit}`
                  if (prev != null) return `ant: ${prev}${unit}`
                  return null
                }

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
                    <TouchableOpacity
                      onPress={() => !set.completed && cycleSetType(globalIdx)}
                      disabled={set.completed}
                      style={{
                        width: 32, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: set.completed ? 'transparent' : SET_TYPE_CONFIG[set.setLogType].bg,
                        borderRadius: 8, paddingVertical: 2, minHeight: 44, gap: 1,
                      }}
                    >
                      <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: set.completed ? '#22c55e' : SET_TYPE_CONFIG[set.setLogType].text }}>
                        {set.setNumber}
                      </Text>
                      {!set.completed && SET_TYPE_CONFIG[set.setLogType].badge && (
                        <Text style={{ fontSize: 8, fontFamily: 'Inter_700Bold', color: SET_TYPE_CONFIG[set.setLogType].text }}>
                          {SET_TYPE_CONFIG[set.setLogType].badge}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Kg column */}
                    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                      <TextInput
                        value={set.weightKg}
                        onChangeText={v => updateSet(globalIdx, 'weightKg', v)}
                        placeholder={prevLog?.weightKg != null ? String(prevLog.weightKg) : '—'}
                        placeholderTextColor="#d1d5db"
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        editable={!set.completed}
                        style={{
                          width: '100%', height: 44, textAlign: 'center', fontSize: 18,
                          fontFamily: 'Inter_700Bold', color: '#111827',
                          backgroundColor: set.completed ? 'transparent' : '#f9fafb',
                          borderRadius: 8, borderWidth: set.completed ? 0 : 1, borderColor: '#e5e7eb',
                        }}
                      />
                      {deltaLabel(weightDelta, prevLog?.weightKg ?? null, 'kg') && (
                        <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: deltaColor(weightDelta) }}>
                          {deltaLabel(weightDelta, prevLog?.weightKg ?? null, 'kg')}
                        </Text>
                      )}
                    </View>

                    {/* Reps column */}
                    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                      <TextInput
                        value={set.repsCompleted}
                        onChangeText={v => updateSet(globalIdx, 'repsCompleted', v)}
                        placeholder="—"
                        placeholderTextColor="#d1d5db"
                        keyboardType="number-pad"
                        inputMode="numeric"
                        editable={!set.completed}
                        style={{
                          width: '100%', height: 44, textAlign: 'center', fontSize: 18,
                          fontFamily: 'Inter_700Bold', color: '#111827',
                          backgroundColor: set.completed ? 'transparent' : '#f9fafb',
                          borderRadius: 8, borderWidth: set.completed ? 0 : 1, borderColor: '#e5e7eb',
                        }}
                      />
                      {deltaLabel(repsDelta, prevLog?.repsCompleted ?? null, '') && (
                        <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: deltaColor(repsDelta) }}>
                          {deltaLabel(repsDelta, prevLog?.repsCompleted ?? null, '')}
                        </Text>
                      )}
                    </View>

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
                {activeExerciseIdx < session.exercises.length - 1 && !session.freeSession && (
                  <TouchableOpacity
                    onPress={() => setActiveExerciseIdx(i => i + 1)}
                    style={{ flex: 1, backgroundColor: '#1e3a5f', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: 'white' }}>Siguiente →</Text>
                  </TouchableOpacity>
                )}
                {(activeExerciseIdx === session.exercises.length - 1 || session.freeSession) && (
                  <TouchableOpacity
                    onPress={handleFinish}
                    style={{ flex: 1, backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: 'white' }}>Finalizar sesión ✓</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Cardio note — only on last exercise */}
              {activeExerciseIdx === session.exercises.length - 1 && session.workoutDay?.cardioNotes && (
                <View style={{ backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 14 }}>🏃</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>Cardio post-sesión</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#1e40af', lineHeight: 18 }}>{session.workoutDay.cardioNotes}</Text>
                  </View>
                </View>
              )}
            </View>
          )
        })()}
      </ScrollView>
    </View>
  )
}
