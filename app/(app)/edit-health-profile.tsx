import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { getHealthProfile, patchHealthProfile } from '../../src/api/profile'

function Field({
  label, value, onChangeText, placeholder, keyboardType = 'decimal-pad', unit,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder: string
  keyboardType?: 'decimal-pad' | 'number-pad'
  unit?: string
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#d1d5db"
          keyboardType={keyboardType}
          inputMode={keyboardType === 'number-pad' ? 'numeric' : 'decimal'}
          style={{
            flex: 1, backgroundColor: '#f9fafb', borderRadius: 10,
            paddingHorizontal: 14, paddingVertical: 13,
            fontSize: 16, fontFamily: 'Inter_400Regular', color: '#111827',
            borderWidth: 1, borderColor: '#e5e7eb',
          }}
        />
        {unit && (
          <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#9ca3af', minWidth: 32 }}>{unit}</Text>
        )}
      </View>
    </View>
  )
}

export default function EditHealthProfileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['health-profile'],
    queryFn: getHealthProfile,
  })

  const profile = data?.profile

  const [weightKg, setWeightKg] = useState(profile?.weightKg?.toString() ?? '')
  const [weightGoalKg, setWeightGoalKg] = useState(profile?.weightGoalKg?.toString() ?? '')
  const [heightCm, setHeightCm] = useState(profile?.heightCm?.toString() ?? '')
  const [hrResting, setHrResting] = useState(profile?.hrResting?.toString() ?? '')
  const [hrMax, setHrMax] = useState(profile?.hrMax?.toString() ?? '')
  const [sleepHoursAvg, setSleepHoursAvg] = useState(profile?.sleepHoursAvg?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSaving(true)
    try {
      await patchHealthProfile({
        weightKg:     weightKg     ? parseFloat(weightKg)     : undefined,
        weightGoalKg: weightGoalKg ? parseFloat(weightGoalKg) : undefined,
        heightCm:     heightCm     ? parseFloat(heightCm)     : undefined,
        hrResting:    hrResting    ? parseInt(hrResting)       : undefined,
        hrMax:        hrMax        ? parseInt(hrMax)           : undefined,
        sleepHoursAvg: sleepHoursAvg ? parseFloat(sleepHoursAvg) : undefined,
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: ['health-profile'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      router.back()
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40, paddingHorizontal: 16, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5 }}>
              Perfil de salud
            </Text>
            <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
              Actualiza tus métricas físicas
            </Text>
          </View>
        </View>

        {/* Peso */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Peso
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Peso actual" value={weightKg} onChangeText={setWeightKg} placeholder="72.5" unit="kg" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Meta de peso" value={weightGoalKg} onChangeText={setWeightGoalKg} placeholder="68.0" unit="kg" />
            </View>
          </View>
        </View>

        {/* Datos físicos */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Datos físicos
          </Text>
          <Field label="Altura" value={heightCm} onChangeText={setHeightCm} placeholder="175" keyboardType="number-pad" unit="cm" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="FC reposo" value={hrResting} onChangeText={setHrResting} placeholder="58" keyboardType="number-pad" unit="bpm" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="FC máxima" value={hrMax} onChangeText={setHrMax} placeholder="185" keyboardType="number-pad" unit="bpm" />
            </View>
          </View>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: -6 }}>
            La FC máxima se estima automáticamente si no la ingresas.
          </Text>
          <Field label="Sueño promedio" value={sleepHoursAvg} onChangeText={setSleepHoursAvg} placeholder="7.5" unit="h" />
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#1e3a5f', borderRadius: 14, paddingVertical: 18,
            alignItems: 'center', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Guardar cambios</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
