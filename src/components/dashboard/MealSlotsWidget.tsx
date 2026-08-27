// DASH-MEAL-01 — Widget de comidas del dia (4 slots)
// Muestra Desayuno/Almuerzo/Cena/Snack con estado logged/pending

import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { apiFetch } from '../../api/client'

type MealSlot = {
  key: string
  label: string
  emoji: string
  kcal: number | null
}

const SLOTS: { key: string; label: string; emoji: string }[] = [
  { key: 'BREAKFAST', label: 'Desayuno', emoji: '🌅' },
  { key: 'LUNCH',     label: 'Almuerzo', emoji: '☀️' },
  { key: 'DINNER',    label: 'Cena',     emoji: '🌙' },
  { key: 'SNACK',     label: 'Snack',    emoji: '🍎' },
]

export default function MealSlotsWidget() {
  const router = useRouter()
  const [slots, setSlots] = useState<MealSlot[]>(
    SLOTS.map(s => ({ ...s, kcal: null }))
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ logs: { mealType: string; kcal: number }[] }>('/api/mobile/nutrition/log')
      .then(data => {
        const logs = data.logs ?? []
        const kcalByType: Record<string, number> = {}
        for (const log of logs) {
          kcalByType[log.mealType] = (kcalByType[log.mealType] ?? 0) + (log.kcal ?? 0)
        }
        setSlots(SLOTS.map(s => ({
          ...s,
          kcal: kcalByType[s.key] ? Math.round(kcalByType[s.key]) : null,
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#f3f4f6',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    }}>
      <View style={{ height: 3, backgroundColor: '#22c55e' }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 10 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>
            🍽️  Tu alimentacion hoy
          </Text>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(app)/(tabs)/nutrition') }}
            activeOpacity={0.7}
            style={{ backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}
          >
            <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#22c55e' }}>
              Ver detalle →
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4 slots */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {slots.map(slot => {
            const logged = slot.kcal !== null
            return (
              <TouchableOpacity
                key={slot.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  router.push('/(app)/(tabs)/nutrition')
                }}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 10,
                  paddingHorizontal: 4,
                  borderRadius: 14,
                  backgroundColor: logged ? 'rgba(34,197,94,0.08)' : '#f7f7f7',
                }}
              >
                <Text style={{ fontSize: 20, lineHeight: 24 }}>{slot.emoji}</Text>
                <Text style={{
                  fontSize: 10,
                  fontFamily: 'Inter_600SemiBold',
                  color: logged ? '#168a3b' : '#999',
                }}>
                  {slot.label}
                </Text>
                {loading ? (
                  <Text style={{ fontSize: 9, color: '#ccc' }}>...</Text>
                ) : logged ? (
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#22c55e' }}>
                    ✓ {slot.kcal} kcal
                  </Text>
                ) : (
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_500Medium', color: '#ea580c' }}>
                    + Agregar
                  </Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </View>
  )
}
