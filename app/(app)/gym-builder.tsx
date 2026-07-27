import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { apiFetch } from '../../src/api/client'
import { assignTemplate } from '../../src/api/gym'

// ─── Types ────────────────────────────────────────────────────────────────────

type PickerExercise = { id: string; name: string; bodyPart: string }
type ExerciseEntry = { exercise: PickerExercise; sets: number; repsScheme: string }

const SETS_OPTIONS = [2, 3, 4, 5]
const REPS_OPTIONS = ['8', '10', '12', '15', '8-10', '10-12', '12-15', '6-8', 'AMRAP']

// ─── Exercise Picker ──────────────────────────────────────────────────────────

function ExercisePicker({ onSelect }: { onSelect: (ex: PickerExercise) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PickerExercise[]>([])
  const [loading, setLoading] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (q.length < 2) { setResults([]); return }
    if (timeout.current) clearTimeout(timeout.current)
    timeout.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await apiFetch<{ exercises: PickerExercise[] }>(`/api/gym/exercises/search?q=${encodeURIComponent(q)}`)
        setResults(res.exercises ?? [])
      } catch { setResults([]) } finally { setLoading(false) }
    }, 300)
  }, [q])

  return (
    <View style={{ gap: 8 }}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Buscar ejercicio..."
        placeholderTextColor="#94a3b8"
        autoFocus
        style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#0f172a' }}
      />
      {loading && <ActivityIndicator color="#f97316" style={{ alignSelf: 'flex-start' }} />}
      {results.map(ex => (
        <TouchableOpacity
          key={ex.id}
          onPress={() => { onSelect(ex); setQ('') }}
          style={{ backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{ex.name}</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{ex.bodyPart}</Text>
          </View>
          <Ionicons name="add-circle-outline" size={20} color="#1e3a5f" />
        </TouchableOpacity>
      ))}
      {q.length >= 2 && !loading && results.length === 0 && (
        <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'center', paddingVertical: 8 }}>Sin resultados para "{q}"</Text>
      )}
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GymBuilderScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [name, setName] = useState('')
  const [exercises, setExercises] = useState<ExerciseEntry[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  function addExercise(ex: PickerExercise) {
    if (exercises.find(e => e.exercise.id === ex.id)) return
    setExercises(prev => [...prev, { exercise: ex, sets: 4, repsScheme: '12' }])
    setShowPicker(false)
  }

  function removeExercise(idx: number) {
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  function updateSets(idx: number, sets: number) {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, sets } : e))
  }

  function updateReps(idx: number, repsScheme: string) {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, repsScheme } : e))
  }

  async function handleSave() {
    if (!name.trim()) return Alert.alert('', 'Dale un nombre a tu rutina.')
    if (exercises.length === 0) return Alert.alert('', 'Agrega al menos un ejercicio.')

    setSaving(true)
    try {
      const template = await apiFetch<{ id: string }>('/api/athlete/gym/routines', {
        method: 'POST',
        body: {
          name: name.trim(),
          daysPerWeek: 1,
          days: [{
            dayOfWeek: 1,
            label: name.trim(),
            muscleGroups: [],
            isRestDay: false,
            exercises: exercises.map((e, i) => ({
              exerciseId: e.exercise.id,
              sets: e.sets,
              repsScheme: e.repsScheme,
              restSeconds: 90,
              order: i,
            })),
          }],
        },
      })
      await assignTemplate(template.id)
      Alert.alert('¡Rutina creada!', 'Tu rutina fue guardada y asignada. Ya puedes empezar a entrenar.', [
        { text: 'Ir al gym', onPress: () => router.replace('/(app)/(tabs)/gym') },
      ])
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar la rutina.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1e3a5f', paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: 'white', flex: 1 }}>Crear rutina</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#f97316' }}>Guardar</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
          {/* Nombre */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Nombre de la rutina</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ej: Push — pecho y hombros"
              placeholderTextColor="#94a3b8"
              style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#0f172a' }}
            />
          </View>

          {/* Ejercicios */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>
              Ejercicios {exercises.length > 0 ? `(${exercises.length})` : ''}
            </Text>

            {exercises.map((entry, idx) => (
              <View key={entry.exercise.id} style={{ backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827' }}>{entry.exercise.name}</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{entry.exercise.bodyPart}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeExercise(idx)}>
                    <Ionicons name="close-circle" size={20} color="#e5e7eb" />
                  </TouchableOpacity>
                </View>

                {/* Sets */}
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>Series</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {SETS_OPTIONS.map(s => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => updateSets(idx, s)}
                        style={{ width: 40, height: 34, borderRadius: 8, borderWidth: 1.5, borderColor: entry.sets === s ? '#1e3a5f' : '#e2e8f0', backgroundColor: entry.sets === s ? '#1e3a5f' : 'white', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: entry.sets === s ? 'white' : '#374151' }}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Reps */}
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>Repeticiones</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {REPS_OPTIONS.map(r => (
                        <TouchableOpacity
                          key={r}
                          onPress={() => updateReps(idx, r)}
                          style={{ paddingHorizontal: 12, height: 34, borderRadius: 8, borderWidth: 1.5, borderColor: entry.repsScheme === r ? '#f97316' : '#e2e8f0', backgroundColor: entry.repsScheme === r ? '#f97316' : 'white', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: entry.repsScheme === r ? 'white' : '#374151' }}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            ))}

            {/* Add exercise button */}
            {!showPicker ? (
              <TouchableOpacity
                onPress={() => setShowPicker(true)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'white', borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#1e3a5f', padding: 14 }}
              >
                <Ionicons name="add-circle-outline" size={18} color="#1e3a5f" />
                <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>Agregar ejercicio</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Buscar ejercicio</Text>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Ionicons name="close" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
                <ExercisePicker onSelect={addExercise} />
              </View>
            )}
          </View>

          {/* Info */}
          {exercises.length > 0 && (
            <View style={{ backgroundColor: '#eff6ff', borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#1d4ed8' }}>
                Esta rutina se guardará y asignará como tu entrenamiento activo. Podrás editarla desde el gym en cualquier momento.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
