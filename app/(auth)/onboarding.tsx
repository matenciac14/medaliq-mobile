import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiFetch, saveToken } from '../../src/api/client'
import { useAuthStore } from '../../src/store/auth'
import type { SessionUser } from '../../src/api/auth'

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivityType = 'GYM' | 'RUNNING'
type GymGoal = 'MUSCLE_GAIN' | 'FAT_LOSS' | 'RECOMPOSITION'
type RunningGoal = 'GENERAL_FITNESS' | 'RACE_5K' | 'RACE_10K'
type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
type Step = 'goal' | 'profile-1' | 'profile-2' | 'generating'

type FormData = {
  activityType: ActivityType | null
  gymGoal: GymGoal | null
  runningGoal: RunningGoal | null
  gender: 'male' | 'female'
  age: string
  weightKg: string
  heightCm: string
  weightGoalKg: string
  daysPerWeek: number
  sessionMinutes: number
  experienceLevel: ExperienceLevel | null
  injuries: string
  conditions: string
}

const INITIAL: FormData = {
  activityType: null,
  gymGoal: null,
  runningGoal: null,
  gender: 'male',
  age: '',
  weightKg: '',
  heightCm: '',
  weightGoalKg: '',
  daysPerWeek: 4,
  sessionMinutes: 60,
  experienceLevel: null,
  injuries: '',
  conditions: '',
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVITIES = [
  { id: 'RUNNING' as ActivityType, label: 'Running', emoji: '🏃', desc: 'Correr, mejorar ritmo y resistencia' },
  { id: 'GYM' as ActivityType, label: 'Ejercicios', emoji: '🏋️', desc: 'Gym, pesas y recomposición corporal' },
]

const RUNNING_GOALS = [
  { id: 'GENERAL_FITNESS' as RunningGoal, label: 'Fitness general', emoji: '💪' },
  { id: 'RACE_5K' as RunningGoal, label: 'Carrera 5K', emoji: '🏅' },
  { id: 'RACE_10K' as RunningGoal, label: 'Carrera 10K', emoji: '🏅' },
]

const GYM_GOALS = [
  { id: 'MUSCLE_GAIN' as GymGoal, label: 'Ganar músculo', emoji: '📈' },
  { id: 'FAT_LOSS' as GymGoal, label: 'Perder grasa', emoji: '🔥' },
  { id: 'RECOMPOSITION' as GymGoal, label: 'Recomposición', emoji: '⚖️' },
]

const EXPERIENCE_LEVELS = [
  { id: 'BEGINNER' as ExperienceLevel, label: 'Principiante', desc: '< 1 año' },
  { id: 'INTERMEDIATE' as ExperienceLevel, label: 'Intermedio', desc: '1–3 años' },
  { id: 'ADVANCED' as ExperienceLevel, label: 'Avanzado', desc: '3+ años' },
]

const SESSION_OPTIONS = [30, 45, 60, 90]

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { setUser } = useAuthStore()
  const [stepHistory, setStepHistory] = useState<Step[]>(['goal'])
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)

  const fadeAnim  = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  const step = stepHistory[stepHistory.length - 1]

  useEffect(() => {
    fadeAnim.setValue(0)
    slideAnim.setValue(24)
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start()
  }, [step])

  const currentStepIndex = stepHistory.filter(s => s !== 'generating').length
  const totalSteps = 3 // goal + profile-1 + profile-2

  function next() {
    const nextStep = getNextStep(step)
    if (nextStep === 'generating') {
      handleGenerate()
    } else {
      setStepHistory(h => [...h, nextStep])
    }
  }

  function back() {
    setStepHistory(h => h.slice(0, -1))
  }

  function getNextStep(current: Step): Step {
    switch (current) {
      case 'goal': return 'profile-1'
      case 'profile-1': return 'profile-2'
      case 'profile-2': return 'generating'
      default: return 'generating'
    }
  }

  const canNext = (() => {
    if (step === 'goal') {
      if (!form.activityType) return false
      if (form.activityType === 'GYM' && !form.gymGoal) return false
      if (form.activityType === 'RUNNING' && !form.runningGoal) return false
      return true
    }
    if (step === 'profile-1') return !!form.age && !!form.weightKg && !!form.heightCm
    return true
  })()

  async function handleGenerate() {
    if (!form.age || !form.weightKg || !form.heightCm) {
      Alert.alert('Faltan datos', 'Completa tu edad, peso y altura.')
      return
    }
    setStepHistory(h => [...h, 'generating'])
    setLoading(true)
    try {
      const payload = {
        activityType: form.activityType,
        gymGoal: form.gymGoal,
        runningGoal: form.runningGoal,
        gender: form.gender,
        age: parseInt(form.age),
        weightKg: parseFloat(form.weightKg),
        heightCm: parseFloat(form.heightCm),
        weightGoalKg: form.weightGoalKg ? parseFloat(form.weightGoalKg) : null,
        daysPerWeek: form.daysPerWeek,
        sessionMinutes: form.sessionMinutes,
        experienceLevel: form.experienceLevel,
        injuries: form.injuries,
        conditions: form.conditions,
      }

      const res = await apiFetch<{ success: boolean; token: string; isB2B: boolean }>(
        '/api/mobile/onboarding/generate',
        { method: 'POST', body: payload }
      )

      if (res.token) {
        await saveToken(res.token)
      }

      const me = await apiFetch<SessionUser>('/api/mobile/auth/me')
      setUser(me)

      if (res.isB2B) {
        Alert.alert(
          'Perfil creado',
          'Tu coach revisará tu perfil y activará tu cuenta.',
          [{ text: 'Entendido', onPress: () => router.replace('/(auth)/login') }]
        )
      } else {
        router.replace('/(app)/(tabs)/dashboard')
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo configurar tu cuenta.')
      setStepHistory(h => h.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  // ── Generating screen ──────────────────────────────────────────────────────

  if (step === 'generating') {
    return (
      <View style={{ flex: 1, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 24 }}>
        <View style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: 'white', fontSize: 36, fontFamily: 'Inter_900Black', lineHeight: 40 }}>M</Text>
        </View>
        <ActivityIndicator color="#f97316" size="large" />
        <Text style={{ color: 'white', fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' }}>
          Configurando tu cuenta...
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
          Calculando tus objetivos iniciales
        </Text>
      </View>
    )
  }

  const progressPct = Math.round((currentStepIndex / totalSteps) * 100)

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
    >
      {/* Progress bar */}
      <View style={{ paddingTop: insets.top, backgroundColor: '#f8fafc' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#94a3b8' }}>
            Paso {currentStepIndex} de {totalSteps}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#f97316' }}>
            {progressPct}%
          </Text>
        </View>
        <View style={{ height: 4, backgroundColor: '#e2e8f0', marginHorizontal: 20, borderRadius: 2 }}>
          <Animated.View style={{ height: 4, backgroundColor: '#f97316', width: `${progressPct}%`, borderRadius: 2 }} />
        </View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Header */}
        <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#0f172a', marginBottom: 6 }}>
          {STEP_TITLES[step]}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#64748b', marginBottom: 24 }}>
          {STEP_SUBTITLES[step]}
        </Text>

        {/* ── Step: Goal ── */}
        {step === 'goal' && (
          <View style={{ gap: 12 }}>
            {ACTIVITIES.map(a => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setForm(f => ({ ...f, activityType: a.id, gymGoal: null, runningGoal: null }))}
                activeOpacity={0.85}
                style={{
                  borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: form.activityType === a.id ? '#1e3a5f' : 'white',
                  borderWidth: 2, borderColor: form.activityType === a.id ? '#1e3a5f' : '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 28 }}>{a.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: form.activityType === a.id ? 'white' : '#0f172a' }}>{a.label}</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: form.activityType === a.id ? 'rgba(255,255,255,0.65)' : '#64748b', marginTop: 2 }}>{a.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Running sub-goals */}
            {form.activityType === 'RUNNING' && (
              <View style={{ marginTop: 8, padding: 16, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', gap: 8 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#374151', marginBottom: 4 }}>¿Cuál es tu meta?</Text>
                {RUNNING_GOALS.map(g => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setForm(f => ({ ...f, runningGoal: g.id }))}
                    activeOpacity={0.85}
                    style={{
                      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      backgroundColor: form.runningGoal === g.id ? '#f97316' : 'white',
                      borderWidth: 2, borderColor: form.runningGoal === g.id ? '#f97316' : '#e2e8f0',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{g.emoji}</Text>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: form.runningGoal === g.id ? 'white' : '#0f172a' }}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Gym sub-goals */}
            {form.activityType === 'GYM' && (
              <View style={{ marginTop: 8, padding: 16, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', gap: 8 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#374151', marginBottom: 4 }}>¿Cuál es tu meta?</Text>
                {GYM_GOALS.map(g => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setForm(f => ({ ...f, gymGoal: g.id }))}
                    activeOpacity={0.85}
                    style={{
                      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      backgroundColor: form.gymGoal === g.id ? '#f97316' : 'white',
                      borderWidth: 2, borderColor: form.gymGoal === g.id ? '#f97316' : '#e2e8f0',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{g.emoji}</Text>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: form.gymGoal === g.id ? 'white' : '#0f172a' }}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Step: Profile 1 (datos físicos) ── */}
        {step === 'profile-1' && (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <Text style={labelStyle}>Género</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {([['male', '♂ Hombre'], ['female', '♀ Mujer']] as const).map(([v, l]) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setForm(f => ({ ...f, gender: v }))}
                    activeOpacity={0.85}
                    style={{
                      flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
                      backgroundColor: form.gender === v ? '#1e3a5f' : 'white',
                      borderWidth: 2, borderColor: form.gender === v ? '#1e3a5f' : '#e2e8f0',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: form.gender === v ? 'white' : '#0f172a' }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={labelStyle}>Edad</Text>
              <TextInput value={form.age} onChangeText={v => setForm(f => ({ ...f, age: v }))} placeholder="32" placeholderTextColor="#94a3b8" keyboardType="number-pad" inputMode="numeric" style={fieldStyle} />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={labelStyle}>Peso (kg)</Text>
              <TextInput value={form.weightKg} onChangeText={v => setForm(f => ({ ...f, weightKg: v }))} placeholder="68" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" inputMode="decimal" style={fieldStyle} />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={labelStyle}>Altura (cm)</Text>
              <TextInput value={form.heightCm} onChangeText={v => setForm(f => ({ ...f, heightCm: v }))} placeholder="170" placeholderTextColor="#94a3b8" keyboardType="number-pad" inputMode="numeric" style={fieldStyle} />
            </View>

            {form.activityType === 'GYM' && (
              <View style={{ gap: 6 }}>
                <Text style={{ ...labelStyle, color: '#94a3b8' }}>Peso objetivo (kg) — opcional</Text>
                <TextInput value={form.weightGoalKg} onChangeText={v => setForm(f => ({ ...f, weightGoalKg: v }))} placeholder="65" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" inputMode="decimal" style={fieldStyle} />
              </View>
            )}

            <View style={{ gap: 8 }}>
              <Text style={{ ...labelStyle, color: '#94a3b8' }}>Nivel de experiencia — opcional</Text>
              {EXPERIENCE_LEVELS.map(e => (
                <TouchableOpacity
                  key={e.id}
                  onPress={() => setForm(f => ({ ...f, experienceLevel: f.experienceLevel === e.id ? null : e.id }))}
                  activeOpacity={0.85}
                  style={{
                    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: form.experienceLevel === e.id ? '#1e3a5f' : 'white',
                    borderWidth: 2, borderColor: form.experienceLevel === e.id ? '#1e3a5f' : '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: form.experienceLevel === e.id ? 'white' : '#0f172a' }}>{e.label}</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: form.experienceLevel === e.id ? 'rgba(255,255,255,0.65)' : '#64748b' }}>{e.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Step: Profile 2 (disponibilidad + salud) ── */}
        {step === 'profile-2' && (
          <View style={{ gap: 20 }}>
            <View style={{ gap: 12 }}>
              <Text style={labelStyle}>Días de entrenamiento por semana</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[3, 4, 5, 6].map(d => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setForm(f => ({ ...f, daysPerWeek: d }))}
                    activeOpacity={0.85}
                    style={{
                      flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
                      backgroundColor: form.daysPerWeek === d ? '#f97316' : 'white',
                      borderWidth: 2, borderColor: form.daysPerWeek === d ? '#f97316' : '#e2e8f0',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: form.daysPerWeek === d ? 'white' : '#0f172a' }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Text style={labelStyle}>Duración por sesión</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {SESSION_OPTIONS.map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setForm(f => ({ ...f, sessionMinutes: m }))}
                    activeOpacity={0.85}
                    style={{
                      flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
                      backgroundColor: form.sessionMinutes === m ? '#f97316' : 'white',
                      borderWidth: 2, borderColor: form.sessionMinutes === m ? '#f97316' : '#e2e8f0',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: form.sessionMinutes === m ? 'white' : '#0f172a' }}>{m}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ ...labelStyle, color: '#94a3b8' }}>Lesiones o molestias — opcional</Text>
              <TextInput
                value={form.injuries}
                onChangeText={v => setForm(f => ({ ...f, injuries: v }))}
                placeholder="Ej: dolor en rodilla derecha"
                placeholderTextColor="#94a3b8"
                style={fieldStyle}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ ...labelStyle, color: '#94a3b8' }}>Condiciones médicas — opcional</Text>
              <TextInput
                value={form.conditions}
                onChangeText={v => setForm(f => ({ ...f, conditions: v }))}
                placeholder="Ej: hipertensión, asma"
                placeholderTextColor="#94a3b8"
                style={fieldStyle}
              />
            </View>
          </View>
        )}
      </Animated.ScrollView>

      {/* Bottom actions */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
        paddingTop: 16,
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e2e8f0',
        flexDirection: 'row', gap: 12,
      }}>
        {stepHistory.length > 1 && (
          <TouchableOpacity
            onPress={back}
            activeOpacity={0.85}
            style={{ flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#f1f5f9' }}
          >
            <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#64748b' }}>Atrás</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={next}
          disabled={!canNext || loading}
          activeOpacity={0.85}
          style={{
            flex: 2, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
            backgroundColor: canNext ? '#f97316' : '#e2e8f0',
          }}
        >
          <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: canNext ? 'white' : '#94a3b8' }}>
            {step === 'profile-2' ? 'Guardar y entrar' : 'Continuar'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ── Step metadata ─────────────────────────────────────────────────────────────

const STEP_TITLES: Record<Step, string> = {
  'goal': '¿Cómo quieres entrenar?',
  'profile-1': 'Tus datos',
  'profile-2': 'Disponibilidad y salud',
  'generating': 'Configurando...',
}

const STEP_SUBTITLES: Record<Step, string> = {
  'goal': 'Medaliq se adapta a tu forma de entrenar.',
  'profile-1': 'Con esto calculamos tus calorías y macros.',
  'profile-2': 'Tu plan se adapta al tiempo que tienes.',
  'generating': '',
}

// ── Styles ────────────────────────────────────────────────────────────────────

const labelStyle = {
  fontSize: 14,
  fontFamily: 'Inter_700Bold',
  color: '#374151',
} as const

const fieldStyle = {
  backgroundColor: '#f8fafc',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  fontFamily: 'Inter_400Regular',
  color: '#0f172a',
  borderWidth: 2,
  borderColor: '#e2e8f0',
} as const
