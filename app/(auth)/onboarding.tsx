import { useState, useCallback } from 'react'
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
  Modal,
} from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiFetch, saveToken } from '../../src/api/client'
import { useAuthStore } from '../../src/store/auth'
import type { SessionUser } from '../../src/api/auth'

// ── Types ─────────────────────────────────────────────────────────────────────

type OnboardingGoal = 'LOSE_FAT' | 'GAIN_MUSCLE' | 'STAY_HEALTHY'
type Gender = 'male' | 'female' | 'other'

type FormData = {
  dateOfBirth: Date | null
  gender: Gender
  heightCm: string
  weightKg: string
  weightGoalKg: string
  goal: OnboardingGoal | null
  daysPerWeek: number
}

const DEFAULT_DOB = new Date(1996, 0, 15) // sensible default for picker

const INITIAL: FormData = {
  dateOfBirth: null,
  gender: 'male',
  heightCm: '',
  weightKg: '',
  weightGoalKg: '',
  goal: null,
  daysPerWeek: 4,
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GOALS: { id: OnboardingGoal; label: string; desc: string; emoji: string }[] = [
  { id: 'LOSE_FAT', label: 'Perder grasa', desc: 'Deficit calorico', emoji: '\u{1F525}' },
  { id: 'GAIN_MUSCLE', label: 'Ganar musculo', desc: 'Superavit calorico', emoji: '\u{1F4AA}' },
  { id: 'STAY_HEALTHY', label: 'Mantenerme saludable', desc: 'Comer bien', emoji: '\u26A1' },
]

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'Masculino' },
  { id: 'female', label: 'Femenino' },
  { id: 'other', label: 'Otro' },
]

const DAYS = [2, 3, 4, 5, 6, 7]

const MIN_DOB = new Date(Date.now() - 80 * 365.25 * 24 * 60 * 60 * 1000)
const MAX_DOB = new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000)

// ── Colors (from Figma) ──────────────────────────────────────────────────────

const C = {
  navy: '#1a2744',
  orange: '#e8612e',
  white: '#ffffff',
  bg: '#f7f7f9',
  textMuted: '#8c8c94',
  border: '#d9d9de',
  loadingText: '#1e3a5f',
  loadingSubtext: '#6b737d',
} as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { setUser } = useAuthStore()
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const canSubmit = !!form.dateOfBirth && !!form.heightCm && !!form.weightKg && !!form.goal

  // Temp date for iOS picker — only commit on "Listo"
  const [tempDate, setTempDate] = useState<Date>(DEFAULT_DOB)

  const onDateChange = useCallback((_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false)
      if (selectedDate) setForm(f => ({ ...f, dateOfBirth: selectedDate }))
    } else {
      if (selectedDate) setTempDate(selectedDate)
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !form.dateOfBirth) return

    // Validaciones de rango (paridad con web)
    const h = parseFloat(form.heightCm)
    const w = parseFloat(form.weightKg)
    if (isNaN(h) || h < 100 || h > 250) {
      Alert.alert('Dato invalido', 'La altura debe estar entre 100 y 250 cm.')
      return
    }
    if (isNaN(w) || w < 20 || w > 300) {
      Alert.alert('Dato invalido', 'El peso debe estar entre 20 y 300 kg.')
      return
    }
    const wg = form.weightGoalKg ? parseFloat(form.weightGoalKg) : null
    if (form.goal === 'LOSE_FAT' && wg != null && wg >= w) {
      Alert.alert('Dato invalido', 'El peso objetivo debe ser menor al peso actual.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        dateOfBirth: formatDate(form.dateOfBirth),
        gender: form.gender,
        heightCm: h,
        weightKg: w,
        weightGoalKg: wg,
        goal: form.goal,
        daysPerWeek: form.daysPerWeek,
      }

      const res = await apiFetch<{ success: boolean; token: string; isB2B: boolean }>(
        '/api/mobile/onboarding/generate',
        { method: 'POST', body: payload }
      )

      if (res.token) await saveToken(res.token)

      const me = await apiFetch<SessionUser>('/api/mobile/auth/me')
      setUser(me)

      if (res.isB2B) {
        Alert.alert(
          'Perfil creado',
          'Tu coach revisara tu perfil y activara tu cuenta.',
          [{ text: 'Entendido', onPress: () => router.replace('/(app)/pending') }]
        )
      } else {
        router.replace('/(app)/(tabs)/dashboard')
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo configurar tu cuenta.')
    } finally {
      setLoading(false)
    }
  }, [canSubmit, form, router, setUser])

  // ── Loading screen ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <ActivityIndicator color={C.navy} size="large" />
        <Text style={{ fontSize: 18, fontFamily: 'Inter_600SemiBold', color: C.loadingText, textAlign: 'center' }}>
          Calculando tus metas nutricionales...
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: C.loadingSubtext, textAlign: 'center' }}>
          Esto toma unos segundos
        </Text>
      </View>
    )
  }

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: C.white }}
    >
      {/* Header */}
      <View style={{ backgroundColor: C.navy, paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 24, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ backgroundColor: C.orange, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: C.white }}>M</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: C.white }}>Paso unico</Text>
          </View>
        </View>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: C.white }}>
          Cuentanos sobre ti
        </Text>
        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
          <View style={{ height: 4, backgroundColor: C.orange, borderRadius: 2, width: '100%' }} />
        </View>
      </View>

      {/* Body */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Section title */}
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: C.navy }}>Tu perfil</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: C.textMuted }}>
            Con esto calculamos tus calorias y macros.
          </Text>
        </View>

        {/* Fecha de nacimiento — native date picker */}
        <View style={{ gap: 5 }}>
          <Text style={labelStyle}>Fecha de nacimiento</Text>
          <TouchableOpacity
            onPress={() => {
              setTempDate(form.dateOfBirth ?? DEFAULT_DOB)
              setShowDatePicker(true)
            }}
            activeOpacity={0.85}
            style={inputTouchableStyle}
          >
            <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: form.dateOfBirth ? C.navy : C.textMuted }}>
              {form.dateOfBirth ? formatDate(form.dateOfBirth) : 'Selecciona tu fecha'}
            </Text>
          </TouchableOpacity>

          {/* Android: native dialog */}
          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={form.dateOfBirth ?? DEFAULT_DOB}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={MAX_DOB}
              minimumDate={MIN_DOB}
            />
          )}

          {/* iOS: bottom modal with spinner */}
          {Platform.OS === 'ios' && (
            <Modal visible={showDatePicker} transparent animationType="slide">
              <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <View style={{ backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: C.border }}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} activeOpacity={0.7}>
                      <Text style={{ fontSize: 15, fontFamily: 'Inter_400Regular', color: C.textMuted }}>Cancelar</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: C.navy }}>Fecha de nacimiento</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setForm(f => ({ ...f, dateOfBirth: tempDate }))
                        setShowDatePicker(false)
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: C.orange }}>Listo</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    maximumDate={MAX_DOB}
                    minimumDate={MIN_DOB}
                    locale="es"
                    style={{ height: 200 }}
                  />
                </View>
              </View>
            </Modal>
          )}
        </View>

        {/* Genero */}
        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Genero</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {GENDERS.map(g => {
              const selected = form.gender === g.id
              return (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => setForm(f => ({ ...f, gender: g.id }))}
                  activeOpacity={0.85}
                  style={{
                    flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center',
                    backgroundColor: selected ? C.navy : C.white,
                    borderWidth: 1.5, borderColor: selected ? C.navy : C.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: selected ? C.white : C.navy }}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Altura + Peso */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={labelStyle}>Altura (cm)</Text>
            <TextInput
              value={form.heightCm}
              onChangeText={v => setForm(f => ({ ...f, heightCm: v }))}
              placeholder="175"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              inputMode="numeric"
              returnKeyType="done"
              style={inputStyle}
            />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={labelStyle}>Peso (kg)</Text>
            <TextInput
              value={form.weightKg}
              onChangeText={v => setForm(f => ({ ...f, weightKg: v }))}
              placeholder="75"
              placeholderTextColor={C.textMuted}
              keyboardType="decimal-pad"
              inputMode="decimal"
              returnKeyType="done"
              style={inputStyle}
            />
          </View>
        </View>

        {/* Objetivo */}
        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Cual es tu objetivo?</Text>
          {GOALS.map(g => {
            const selected = form.goal === g.id
            return (
              <TouchableOpacity
                key={g.id}
                onPress={() => setForm(f => ({ ...f, goal: g.id, weightGoalKg: f.weightGoalKg || f.weightKg }))}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                  backgroundColor: selected ? C.orange : C.white,
                  borderWidth: selected ? 0 : 1.5, borderColor: C.border,
                }}
              >
                <Text style={{ fontSize: 20 }}>{g.emoji}</Text>
                <View style={{ gap: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: selected ? C.white : C.navy }}>
                    {g.label}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: selected ? 'rgba(255,255,255,0.8)' : C.textMuted }}>
                    {g.desc}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Peso objetivo — aparece al seleccionar goal */}
        {form.goal && (
          <View style={{ gap: 5 }}>
            <Text style={{ ...labelStyle, color: C.textMuted }}>Peso objetivo (kg) — opcional</Text>
            <TextInput
              value={form.weightGoalKg}
              onChangeText={v => setForm(f => ({ ...f, weightGoalKg: v }))}
              placeholder={form.weightKg || '65'}
              placeholderTextColor={C.textMuted}
              keyboardType="decimal-pad"
              inputMode="decimal"
              returnKeyType="done"
              style={inputStyle}
            />
          </View>
        )}

        {/* Dias por semana */}
        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Dias por semana</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {DAYS.map(d => {
              const selected = form.daysPerWeek === d
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setForm(f => ({ ...f, daysPerWeek: d }))}
                  activeOpacity={0.85}
                  style={{
                    flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: selected ? C.orange : C.white,
                    borderWidth: selected ? 0 : 1.5, borderColor: C.border,
                  }}
                >
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: selected ? C.white : C.navy }}>
                    {d}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: C.white,
        borderTopWidth: 0.5, borderTopColor: 'rgba(217,217,222,0.5)',
        paddingHorizontal: 24, paddingTop: 16,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 34,
      }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={{
            height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
            backgroundColor: canSubmit ? C.orange : C.border,
          }}
        >
          <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: canSubmit ? C.white : C.textMuted }}>
            Empezar →
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const labelStyle = {
  fontSize: 13,
  fontFamily: 'Inter_600SemiBold',
  color: '#1a2744',
} as const

const inputStyle = {
  height: 40,
  backgroundColor: '#ffffff',
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: '#d9d9de',
  paddingHorizontal: 14,
  fontSize: 13,
  fontFamily: 'Inter_400Regular',
  color: '#1a2744',
} as const

const inputTouchableStyle = {
  height: 40,
  backgroundColor: '#ffffff',
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: '#d9d9de',
  paddingHorizontal: 14,
  justifyContent: 'center' as const,
} as const
