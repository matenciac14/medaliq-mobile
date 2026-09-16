// MOB-NUT-04 — Pantalla: Aplicar NutritionTemplate a la semana
// Selector de 7 días con intensidad HARD/EASY/REST por día
// POST /api/mobile/nutrition/templates/[id]/apply

import { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { getNutritionTemplates, applyNutritionTemplate } from '../../src/api/nutrition'
import { DAY_SHORT as DAY_LABELS } from '../../src/constants/calendar'

type DayIntensity = 'HARD' | 'EASY' | 'REST'

const INTENSITY_CONFIG: Record<DayIntensity, { label: string; bg: string; text: string; border: string }> = {
  HARD: { label: 'Duro',     bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  EASY: { label: 'Fácil',    bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
  REST: { label: 'Descanso', bg: '#eff6ff', text: '#2563eb', border: '#93c5fd' },
}

function getMondayStr(weekOffset = 0): string {
  const d = new Date()
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - (dow - 1) + weekOffset * 7)
  return d.toISOString().split('T')[0]
}

function getWeekDays(mondayStr: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${mondayStr}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    return d.toISOString().split('T')[0]
  })
}

export default function NutritionApplyTemplateScreen() {
  const insets   = useSafeAreaInsets()
  const router   = useRouter()
  const qc       = useQueryClient()
  const params   = useLocalSearchParams<{ templateId?: string }>()

  const mondayStr = getMondayStr(0)
  const weekDays  = getWeekDays(mondayStr)

  const [intensityMap, setIntensityMap] = useState<Record<string, DayIntensity>>(() =>
    Object.fromEntries(weekDays.map((d) => [d, 'EASY' as DayIntensity]))
  )

  const { data, isLoading } = useQuery({
    queryKey: ['nutrition-templates'],
    queryFn: getNutritionTemplates,
  })

  const templates = data?.templates ?? []
  const [selectedId, setSelectedId] = useState<string | null>(params.templateId ?? null)
  const selectedTemplate = templates.find(t => t.id === selectedId) ?? null

  const totalKcal = useMemo(() => {
    if (!selectedTemplate) return 0
    return weekDays.reduce((sum, dateStr) => {
      const dayType = intensityMap[dateStr]
      const day = selectedTemplate.days.find(d => d.dayType === dayType)
      if (!day) return sum
      return sum + day.meals.reduce((mSum, m) =>
        mSum + m.items.reduce((iSum, i) => iSum + (i.food.kcalPer100g * i.grams / 100), 0), 0)
    }, 0) / 7
  }, [selectedTemplate, intensityMap, weekDays])

  const { mutate: apply, isPending } = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error('Selecciona una plantilla')
      return applyNutritionTemplate(selectedId, { weekStart: mondayStr, intensityMap })
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['planned-meals'] })
      Alert.alert('¡Listo!', `${res.created} comidas planificadas para esta semana.`, [
        { text: 'Ver plan', onPress: () => router.back() },
      ])
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  function cycleIntensity(dateStr: string) {
    const order: DayIntensity[] = ['HARD', 'EASY', 'REST']
    const curr = intensityMap[dateStr] ?? 'EASY'
    const next = order[(order.indexOf(curr) + 1) % order.length]
    setIntensityMap(prev => ({ ...prev, [dateStr]: next }))
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#1e3a5f" />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827' }}>
          Planificar semana
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>

        {/* Selector de plantilla */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Tu plantilla nutricional
          </Text>
          {isLoading ? (
            <ActivityIndicator color="#ea580c" />
          ) : templates.length === 0 ? (
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>
                Aún no tienes plantillas. Crea una desde la web en Nutrición → Constructor A.
              </Text>
            </View>
          ) : (
            templates.map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setSelectedId(t.id)}
                style={{
                  backgroundColor: selectedId === t.id ? '#fff7ed' : 'white',
                  borderRadius: 16, padding: 14,
                  borderWidth: 1.5,
                  borderColor: selectedId === t.id ? '#ea580c' : '#e5e7eb',
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{t.name}</Text>
                  {t.goal && <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>{t.goal}</Text>}
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 2 }}>
                    {t.days.length} tipos de día · {t.days.reduce((s, d) => s + d.meals.length, 0)} comidas
                  </Text>
                </View>
                {selectedId === t.id && <Ionicons name="checkmark-circle" size={20} color="#ea580c" />}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Selector de intensidad por día */}
        {selectedTemplate && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Intensidad por día — toca para cambiar
            </Text>
            {weekDays.map((dateStr, i) => {
              const intensity = intensityMap[dateStr]!
              const cfg = INTENSITY_CONFIG[intensity]
              const dayLabel = DAY_LABELS[i]
              const [, , dd] = dateStr.split('-')
              return (
                <TouchableOpacity
                  key={dateStr}
                  onPress={() => cycleIntensity(dateStr)}
                  style={{
                    backgroundColor: cfg.bg,
                    borderRadius: 12, padding: 12,
                    borderWidth: 1, borderColor: cfg.border,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>
                    {dayLabel} {parseInt(dd)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: cfg.text }}>{cfg.label}</Text>
                    <Ionicons name="swap-horizontal" size={14} color={cfg.text} />
                  </View>
                </TouchableOpacity>
              )
            })}

            {/* Resumen kcal promedio */}
            <View style={{ backgroundColor: '#fff7ed', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fed7aa', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#92400e' }}>Promedio diario estimado</Text>
              <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#ea580c', marginTop: 2 }}>
                {Math.round(totalKcal)} kcal
              </Text>
            </View>
          </View>
        )}

        {/* CTA aplicar */}
        {selectedTemplate && (
          <TouchableOpacity
            onPress={() => apply()}
            disabled={isPending}
            style={{
              backgroundColor: isPending ? '#9ca3af' : '#1e3a5f',
              borderRadius: 16, paddingVertical: 16,
              alignItems: 'center', marginTop: 4,
            }}
          >
            {isPending
              ? <ActivityIndicator color="white" />
              : <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: 'white' }}>
                  Aplicar plantilla a esta semana →
                </Text>
            }
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  )
}
