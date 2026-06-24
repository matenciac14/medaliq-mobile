import { useState } from 'react'
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
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiFetch, saveToken } from '../../src/api/client'
import { useAuthStore } from '../../src/store/auth'
import type { SessionUser } from '../../src/api/auth'

// ── Types ─────────────────────────────────────────────────────────────────────

type MainGoal = 'SPORT' | 'GYM' | 'BODY'
type Sport = 'RUNNING' | 'CYCLING' | 'SWIMMING' | 'TRIATHLON' | 'FOOTBALL' | 'STRENGTH'
type Step = 'goal' | 'sport' | 'sport-details' | 'hr-fitness' | 'physical' | 'schedule' | 'health' | 'generating'

type FormData = {
  mainGoal: MainGoal | null
  sport: Sport | null
  raceDistance: string | null
  cyclingModality: string | null
  ftpWatts: string
  swimStroke: string | null
  triathlonDistance: string | null
  weakestSegment: string | null
  footballPosition: string | null
  competitionLevel: string | null
  hrSource: 'known' | 'estimated'
  hrMax: string
  gender: 'male' | 'female'
  age: string
  weightKg: string
  heightCm: string
  daysPerWeek: number
  hoursPerSession: number
  injuries: string[]
  conditions: string[]
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null
}

const INITIAL: FormData = {
  mainGoal: null, sport: null, raceDistance: null,
  cyclingModality: null, ftpWatts: '', swimStroke: null,
  triathlonDistance: null, weakestSegment: null,
  footballPosition: null, competitionLevel: null,
  hrSource: 'estimated', hrMax: '',
  gender: 'male', age: '', weightKg: '', heightCm: '',
  daysPerWeek: 4, hoursPerSession: 1,
  injuries: [], conditions: [], experienceLevel: null,
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GOALS = [
  { id: 'SPORT', label: 'Deporte y rendimiento', emoji: '🏅', desc: 'Correr, ciclismo, natación, triatlón...' },
  { id: 'GYM', label: 'Gym y fuerza', emoji: '🏋️', desc: 'Ganar músculo, perder grasa' },
  { id: 'BODY', label: 'Recomposición corporal', emoji: '🔥', desc: 'Mejorar composición sin deporte específico' },
]

const SPORTS = [
  { id: 'RUNNING', label: 'Running', emoji: '🏃' },
  { id: 'CYCLING', label: 'Ciclismo', emoji: '🚴' },
  { id: 'SWIMMING', label: 'Natación', emoji: '🏊' },
  { id: 'TRIATHLON', label: 'Triatlón', emoji: '🏅' },
  { id: 'FOOTBALL', label: 'Fútbol', emoji: '⚽' },
  { id: 'STRENGTH', label: 'Fuerza', emoji: '💪' },
]

const RACE_DISTANCES = [
  { id: 'RACE_5K', label: '5K' },
  { id: 'RACE_10K', label: '10K' },
  { id: 'RACE_HALF_MARATHON', label: 'Media maratón' },
  { id: 'RACE_MARATHON', label: 'Maratón' },
]

const CYCLING_MODALITIES = [
  { id: 'ROAD', label: 'Ruta', emoji: '🚴' },
  { id: 'MTB', label: 'MTB', emoji: '🏔️' },
]

const SWIM_STROKES = [
  { id: 'FREESTYLE', label: 'Libre' },
  { id: 'BREASTSTROKE', label: 'Pecho' },
  { id: 'BACKSTROKE', label: 'Espalda' },
  { id: 'BUTTERFLY', label: 'Mariposa' },
]

const TRIATHLON_DISTANCES = [
  { id: 'SPRINT', label: 'Sprint' },
  { id: 'OLYMPIC', label: 'Olímpico' },
  { id: 'HALF', label: '70.3' },
  { id: 'FULL', label: 'Ironman' },
]

const WEAKEST_SEGMENTS = [
  { id: 'SWIM', label: 'Nado', emoji: '🏊' },
  { id: 'BIKE', label: 'Ciclismo', emoji: '🚴' },
  { id: 'RUN', label: 'Carrera', emoji: '🏃' },
]

const FOOTBALL_POSITIONS = [
  { id: 'GOALKEEPER', label: 'Portero' },
  { id: 'DEFENDER', label: 'Defensa' },
  { id: 'MIDFIELDER', label: 'Centrocampista' },
  { id: 'FORWARD', label: 'Delantero' },
]

const COMPETITION_LEVELS = [
  { id: 'RECREATIONAL', label: 'Recreativo', desc: 'Solo por diversión' },
  { id: 'AMATEUR', label: 'Amateur', desc: 'Ligas locales' },
  { id: 'SEMIPRO', label: 'Semi-pro', desc: 'Nivel competitivo' },
]

const EXPERIENCE_LEVELS = [
  { id: 'BEGINNER', label: 'Principiante', desc: 'Menos de 1 año' },
  { id: 'INTERMEDIATE', label: 'Intermedio', desc: '1 a 3 años' },
  { id: 'ADVANCED', label: 'Avanzado', desc: 'Más de 3 años' },
]

const INJURY_OPTIONS = ['Rodilla', 'Espalda/Lumbar', 'Tobillo', 'Hombro', 'Cadera', 'Ninguna']
const CONDITION_OPTIONS = ['Hipertensión', 'Diabetes', 'Asma', 'Condición cardíaca', 'Ninguna']

const AEROBIC_SPORTS: Sport[] = ['RUNNING', 'CYCLING', 'SWIMMING', 'TRIATHLON']
const SPORTS_WITH_DETAILS: Sport[] = ['CYCLING', 'SWIMMING', 'TRIATHLON', 'FOOTBALL']

function getNextStep(current: Step, form: FormData): Step {
  switch (current) {
    case 'goal':
      return form.mainGoal === 'SPORT' ? 'sport' : 'physical'
    case 'sport':
      if (SPORTS_WITH_DETAILS.includes(form.sport!)) return 'sport-details'
      if (AEROBIC_SPORTS.includes(form.sport!)) return 'hr-fitness'
      return 'physical'
    case 'sport-details':
      if (AEROBIC_SPORTS.includes(form.sport!)) return 'hr-fitness'
      return 'physical'
    case 'hr-fitness': return 'physical'
    case 'physical': return 'schedule'
    case 'schedule': return 'health'
    case 'health': return 'generating'
    default: return 'generating'
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { setUser } = useAuthStore()
  const [stepHistory, setStepHistory] = useState<Step[]>(['goal'])
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)

  const step = stepHistory[stepHistory.length - 1]

  function next() {
    const nextStep = getNextStep(step, form)
    if (nextStep === 'generating') {
      handleGenerate()
    } else {
      setStepHistory(h => [...h, nextStep])
    }
  }

  function back() {
    setStepHistory(h => h.slice(0, -1))
  }

  async function handleGenerate() {
    if (!form.age || !form.weightKg || !form.heightCm) {
      Alert.alert('Faltan datos', 'Completa tu edad, peso y altura.')
      setStepHistory(h => [...h, 'physical'])
      return
    }
    setStepHistory(h => [...h, 'generating'])
    setLoading(true)
    try {
      const payload = {
        mainGoal: form.mainGoal,
        sport: form.sport,
        raceDistance: form.raceDistance,
        cyclingModality: form.cyclingModality,
        ftp: form.ftpWatts ? parseInt(form.ftpWatts) : undefined,
        swimStroke: form.swimStroke,
        triathlonDistance: form.triathlonDistance,
        weakestSegment: form.weakestSegment,
        footballPosition: form.footballPosition,
        competitionLevel: form.competitionLevel,
        hrMax: form.hrSource === 'known' && form.hrMax ? parseInt(form.hrMax) : undefined,
        hrSource: form.hrSource,
        gender: form.gender,
        age: parseInt(form.age),
        weightKg: parseFloat(form.weightKg),
        heightCm: parseFloat(form.heightCm),
        daysPerWeek: form.daysPerWeek,
        hoursPerSession: form.hoursPerSession,
        injuries: form.injuries.filter(i => i !== 'Ninguna'),
        conditions: form.conditions.filter(c => c !== 'Ninguna'),
        experienceLevel: form.experienceLevel,
        nutritionCommitment: 'moderate',
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
          'Tu coach revisará tu perfil y activará tu cuenta. Te notificará directamente cuando esté lista.',
          [{ text: 'Entendido', onPress: () => router.replace('/(auth)/login') }]
        )
      } else {
        router.replace('/(app)/(tabs)/dashboard')
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo generar el plan.')
      setStepHistory(h => h.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  function toggleItem(arr: string[], item: string): string[] {
    if (item === 'Ninguna') return ['Ninguna']
    const filtered = arr.filter(i => i !== 'Ninguna')
    return filtered.includes(item)
      ? filtered.filter(i => i !== item)
      : [...filtered, item]
  }

  const canNext = (() => {
    if (step === 'goal') return !!form.mainGoal
    if (step === 'sport') return !!form.sport
    if (step === 'sport-details') {
      if (form.sport === 'SWIMMING') return !!form.swimStroke
      if (form.sport === 'TRIATHLON') return !!form.triathlonDistance && !!form.weakestSegment
      if (form.sport === 'FOOTBALL') return !!form.footballPosition
      return true // CYCLING — cyclingModality optional
    }
    if (step === 'hr-fitness') return true // hrMax optional (can be estimated)
    if (step === 'physical') return !!form.age && !!form.weightKg && !!form.heightCm
    return true
  })()

  // ── Generating screen ──────────────────────────────────────────────────────

  if (step === 'generating') {
    return (
      <View style={{ flex: 1, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 24 }}>
        <View style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: 'white', fontSize: 36, fontFamily: 'Inter_900Black', lineHeight: 40 }}>M</Text>
        </View>
        <ActivityIndicator color="#f97316" size="large" />
        <Text style={{ color: 'white', fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' }}>
          Generando tu plan...
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
          Medaliq está creando tu plan personalizado. Esto puede tomar unos segundos.
        </Text>
      </View>
    )
  }

  const totalSteps = stepHistory.filter(s => s !== 'generating').length + 1
  const progressPct = Math.round((stepHistory.length / 8) * 100)

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
    >
      {/* Progress bar */}
      <View style={{ height: 4, backgroundColor: '#e2e8f0', marginTop: insets.top }}>
        <View style={{ height: 4, backgroundColor: '#f97316', width: `${progressPct}%` }} />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#0f172a', marginBottom: 6 }}>
          {stepTitle(step)}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#64748b', marginBottom: 24 }}>
          {stepSubtitle(step)}
        </Text>

        {/* ── Goal step ── */}
        {step === 'goal' && (
          <View style={{ gap: 12 }}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.id}
                onPress={() => setForm(f => ({ ...f, mainGoal: g.id as MainGoal }))}
                activeOpacity={0.85}
                style={{
                  borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14,
                  backgroundColor: form.mainGoal === g.id ? '#1e3a5f' : 'white',
                  borderWidth: 2, borderColor: form.mainGoal === g.id ? '#1e3a5f' : '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 28 }}>{g.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: form.mainGoal === g.id ? 'white' : '#0f172a' }}>{g.label}</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: form.mainGoal === g.id ? 'rgba(255,255,255,0.65)' : '#64748b', marginTop: 2 }}>{g.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Sport step ── */}
        {step === 'sport' && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {SPORTS.map(s => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setForm(f => ({ ...f, sport: s.id as Sport, raceDistance: null, cyclingModality: null, swimStroke: null, triathlonDistance: null, weakestSegment: null, footballPosition: null }))}
                  activeOpacity={0.85}
                  style={{
                    borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, width: '47%',
                    backgroundColor: form.sport === s.id ? '#1e3a5f' : 'white',
                    borderWidth: 2, borderColor: form.sport === s.id ? '#1e3a5f' : '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{s.emoji}</Text>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: form.sport === s.id ? 'white' : '#0f172a' }}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.sport === 'RUNNING' && (
              <View style={{ marginTop: 8, gap: 8 }}>
                <Text style={labelStyle}>Distancia objetivo</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {RACE_DISTANCES.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      onPress={() => setForm(f => ({ ...f, raceDistance: d.id }))}
                      activeOpacity={0.85}
                      style={{
                        borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
                        backgroundColor: form.raceDistance === d.id ? '#f97316' : 'white',
                        borderWidth: 2, borderColor: form.raceDistance === d.id ? '#f97316' : '#e2e8f0',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: form.raceDistance === d.id ? 'white' : '#0f172a' }}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Sport-details step ── */}
        {step === 'sport-details' && (
          <View style={{ gap: 24 }}>
            {form.sport === 'CYCLING' && (
              <>
                <View style={{ gap: 10 }}>
                  <Text style={labelStyle}>Modalidad</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {CYCLING_MODALITIES.map(m => (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => setForm(f => ({ ...f, cyclingModality: m.id }))}
                        activeOpacity={0.85}
                        style={{
                          borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, width: '47%',
                          backgroundColor: form.cyclingModality === m.id ? '#1e3a5f' : 'white',
                          borderWidth: 2, borderColor: form.cyclingModality === m.id ? '#1e3a5f' : '#e2e8f0',
                        }}
                      >
                        <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: form.cyclingModality === m.id ? 'white' : '#0f172a' }}>{m.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={labelStyle}>FTP (opcional)</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#94a3b8', marginTop: -4 }}>Potencia umbral funcional en vatios. Si no lo sabes, déjalo vacío.</Text>
                  <TextInput
                    value={form.ftpWatts}
                    onChangeText={v => setForm(f => ({ ...f, ftpWatts: v }))}
                    placeholder="Ej: 220"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    inputMode="numeric"
                    style={fieldStyle}
                  />
                </View>
              </>
            )}

            {form.sport === 'SWIMMING' && (
              <View style={{ gap: 10 }}>
                <Text style={labelStyle}>Estilo principal</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {SWIM_STROKES.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setForm(f => ({ ...f, swimStroke: s.id }))}
                      activeOpacity={0.85}
                      style={{
                        borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center',
                        backgroundColor: form.swimStroke === s.id ? '#1e3a5f' : 'white',
                        borderWidth: 2, borderColor: form.swimStroke === s.id ? '#1e3a5f' : '#e2e8f0',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: form.swimStroke === s.id ? 'white' : '#0f172a' }}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {form.sport === 'TRIATHLON' && (
              <>
                <View style={{ gap: 10 }}>
                  <Text style={labelStyle}>Distancia objetivo</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {TRIATHLON_DISTANCES.map(d => (
                      <TouchableOpacity
                        key={d.id}
                        onPress={() => setForm(f => ({ ...f, triathlonDistance: d.id }))}
                        activeOpacity={0.85}
                        style={{
                          flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
                          backgroundColor: form.triathlonDistance === d.id ? '#1e3a5f' : 'white',
                          borderWidth: 2, borderColor: form.triathlonDistance === d.id ? '#1e3a5f' : '#e2e8f0',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: form.triathlonDistance === d.id ? 'white' : '#0f172a' }}>{d.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ gap: 10 }}>
                  <Text style={labelStyle}>Segmento más débil</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {WEAKEST_SEGMENTS.map(s => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => setForm(f => ({ ...f, weakestSegment: s.id }))}
                        activeOpacity={0.85}
                        style={{
                          flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4,
                          backgroundColor: form.weakestSegment === s.id ? '#f97316' : 'white',
                          borderWidth: 2, borderColor: form.weakestSegment === s.id ? '#f97316' : '#e2e8f0',
                        }}
                      >
                        <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: form.weakestSegment === s.id ? 'white' : '#0f172a' }}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            {form.sport === 'FOOTBALL' && (
              <>
                <View style={{ gap: 10 }}>
                  <Text style={labelStyle}>Posición</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {FOOTBALL_POSITIONS.map(p => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setForm(f => ({ ...f, footballPosition: p.id }))}
                        activeOpacity={0.85}
                        style={{
                          borderRadius: 12, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center',
                          backgroundColor: form.footballPosition === p.id ? '#1e3a5f' : 'white',
                          borderWidth: 2, borderColor: form.footballPosition === p.id ? '#1e3a5f' : '#e2e8f0',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: form.footballPosition === p.id ? 'white' : '#0f172a' }}>{p.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ gap: 10 }}>
                  <Text style={labelStyle}>Nivel de competición</Text>
                  <View style={{ gap: 8 }}>
                    {COMPETITION_LEVELS.map(l => (
                      <TouchableOpacity
                        key={l.id}
                        onPress={() => setForm(f => ({ ...f, competitionLevel: l.id }))}
                        activeOpacity={0.85}
                        style={{
                          borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                          backgroundColor: form.competitionLevel === l.id ? '#1e3a5f' : 'white',
                          borderWidth: 2, borderColor: form.competitionLevel === l.id ? '#1e3a5f' : '#e2e8f0',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: form.competitionLevel === l.id ? 'white' : '#0f172a' }}>{l.label}</Text>
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: form.competitionLevel === l.id ? 'rgba(255,255,255,0.65)' : '#64748b' }}>{l.desc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── HR Fitness step ── */}
        {step === 'hr-fitness' && (
          <View style={{ gap: 24 }}>
            <View style={{ gap: 12 }}>
              <Text style={labelStyle}>¿Conoces tu FC máxima?</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { id: 'known', label: 'Sí, la conozco', desc: 'La he medido en test' },
                  { id: 'estimated', label: 'Estimarla', desc: 'Se calculará automáticamente' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setForm(f => ({ ...f, hrSource: opt.id as 'known' | 'estimated' }))}
                    activeOpacity={0.85}
                    style={{
                      flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', gap: 4,
                      backgroundColor: form.hrSource === opt.id ? '#1e3a5f' : 'white',
                      borderWidth: 2, borderColor: form.hrSource === opt.id ? '#1e3a5f' : '#e2e8f0',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', textAlign: 'center', color: form.hrSource === opt.id ? 'white' : '#0f172a' }}>{opt.label}</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', color: form.hrSource === opt.id ? 'rgba(255,255,255,0.65)' : '#64748b' }}>{opt.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {form.hrSource === 'known' && (
              <View style={{ gap: 8 }}>
                <Text style={labelStyle}>FC Máxima (ppm)</Text>
                <TextInput
                  value={form.hrMax}
                  onChangeText={v => setForm(f => ({ ...f, hrMax: v }))}
                  placeholder="Ej: 185"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  style={fieldStyle}
                />
              </View>
            )}

            {form.hrSource === 'estimated' && (
              <View style={{ backgroundColor: '#eff6ff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#bfdbfe' }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1e40af', marginBottom: 4 }}>
                  Cálculo automático
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#3b82f6', lineHeight: 20 }}>
                  Usaremos la fórmula 211 - 0.64 × edad para estimar tu FC máxima y calcular tus zonas de entrenamiento.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Physical step ── */}
        {step === 'physical' && (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <Text style={labelStyle}>Sexo biológico</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[['male', 'Masculino'], ['female', 'Femenino']].map(([v, l]) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setForm(f => ({ ...f, gender: v as 'male' | 'female' }))}
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

            <View style={{ gap: 8 }}>
              <Text style={labelStyle}>Edad</Text>
              <TextInput value={form.age} onChangeText={v => setForm(f => ({ ...f, age: v }))} placeholder="Ej: 28" placeholderTextColor="#94a3b8" keyboardType="numeric" inputMode="numeric" style={fieldStyle} />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={labelStyle}>Peso (kg)</Text>
              <TextInput value={form.weightKg} onChangeText={v => setForm(f => ({ ...f, weightKg: v }))} placeholder="Ej: 70" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" inputMode="decimal" style={fieldStyle} />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={labelStyle}>Altura (cm)</Text>
              <TextInput value={form.heightCm} onChangeText={v => setForm(f => ({ ...f, heightCm: v }))} placeholder="Ej: 175" placeholderTextColor="#94a3b8" keyboardType="numeric" inputMode="numeric" style={fieldStyle} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={labelStyle}>Nivel de experiencia</Text>
              <View style={{ gap: 8 }}>
                {EXPERIENCE_LEVELS.map(e => (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => setForm(f => ({ ...f, experienceLevel: e.id as FormData['experienceLevel'] }))}
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
          </View>
        )}

        {/* ── Schedule step ── */}
        {step === 'schedule' && (
          <View style={{ gap: 24 }}>
            <View style={{ gap: 12 }}>
              <Text style={labelStyle}>Días de entrenamiento por semana: <Text style={{ color: '#f97316' }}>{form.daysPerWeek}</Text></Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[2, 3, 4, 5, 6].map(d => (
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
              <Text style={labelStyle}>Horas por sesión: <Text style={{ color: '#f97316' }}>{form.hoursPerSession}h</Text></Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[0.5, 1, 1.5, 2].map(h => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => setForm(f => ({ ...f, hoursPerSession: h }))}
                    activeOpacity={0.85}
                    style={{
                      flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
                      backgroundColor: form.hoursPerSession === h ? '#f97316' : 'white',
                      borderWidth: 2, borderColor: form.hoursPerSession === h ? '#f97316' : '#e2e8f0',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: form.hoursPerSession === h ? 'white' : '#0f172a' }}>{h}h</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── Health step ── */}
        {step === 'health' && (
          <View style={{ gap: 20 }}>
            <View style={{ gap: 10 }}>
              <Text style={labelStyle}>Lesiones actuales</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {INJURY_OPTIONS.map(inj => {
                  const active = form.injuries.includes(inj)
                  return (
                    <TouchableOpacity
                      key={inj}
                      onPress={() => setForm(f => ({ ...f, injuries: toggleItem(f.injuries, inj) }))}
                      activeOpacity={0.85}
                      style={{
                        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                        backgroundColor: active ? '#1e3a5f' : 'white',
                        borderWidth: 2, borderColor: active ? '#1e3a5f' : '#e2e8f0',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: active ? 'white' : '#374151' }}>{inj}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={labelStyle}>Condiciones médicas</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CONDITION_OPTIONS.map(cond => {
                  const active = form.conditions.includes(cond)
                  return (
                    <TouchableOpacity
                      key={cond}
                      onPress={() => setForm(f => ({ ...f, conditions: toggleItem(f.conditions, cond) }))}
                      activeOpacity={0.85}
                      style={{
                        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                        backgroundColor: active ? '#1e3a5f' : 'white',
                        borderWidth: 2, borderColor: active ? '#1e3a5f' : '#e2e8f0',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: active ? 'white' : '#374151' }}>{cond}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

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
            {step === 'health' ? 'Generar mi plan' : 'Continuar'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stepTitle(step: Step): string {
  const map: Record<Step, string> = {
    goal: '¿Cuál es tu objetivo?',
    sport: '¿Qué deporte practicas?',
    'sport-details': 'Detalles de tu deporte',
    'hr-fitness': 'Tu condición cardiovascular',
    physical: 'Tu perfil físico',
    schedule: 'Tu disponibilidad',
    health: 'Salud y restricciones',
    generating: 'Generando...',
  }
  return map[step]
}

function stepSubtitle(step: Step): string {
  const map: Record<Step, string> = {
    goal: 'Elige el que mejor describe lo que quieres lograr.',
    sport: 'Selecciona tu deporte principal.',
    'sport-details': 'Esto permite calibrar mejor tu plan.',
    'hr-fitness': 'Usamos esto para calcular tus zonas de entrenamiento.',
    physical: 'Usamos estos datos para calibrar tu plan.',
    schedule: '¿Cuánto tiempo puedes entrenar?',
    health: 'Selecciona lo que aplica. Puedes omitir si no hay nada.',
    generating: '',
  }
  return map[step]
}

const labelStyle = {
  fontSize: 14,
  fontFamily: 'Inter_700Bold',
  color: '#374151',
} as const

const fieldStyle = {
  backgroundColor: 'white',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  fontFamily: 'Inter_400Regular',
  color: '#0f172a',
  borderWidth: 2,
  borderColor: '#e2e8f0',
} as const
