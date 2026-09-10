// Pantalla 3: Constructor — Planificador semanal
// Figma: 4523:3332 "Nutricion — Mobile · Constructor: Planificador semanal"
// + Figma: 4944:89 "Constructor: Dia sin configurar" (empty state inline)
// Week strip, dias con/sin comidas, lista de comidas del dia, + Agregar, CTA publicar

import { useState, useCallback, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import {
  getPlannedMealsWeek, createPlannedMeal, deletePlannedMeal,
  applyNutritionTemplate, getFoods, getNutritionPage,
} from '../../src/api/nutrition'
import type { PlannedMealItem, PlannedMealsByDate, FoodItem } from '../../src/api/nutrition'
import { DAY_SHORT } from '../../src/constants/calendar'

// ── Helpers ──────────────────────────────────────────────────────────────────

type MealType = 'BREAKFAST' | 'PRE_WORKOUT' | 'LUNCH' | 'SNACK' | 'DINNER' | 'POST_WORKOUT'
const MEAL_ORDER: MealType[] = ['BREAKFAST', 'PRE_WORKOUT', 'LUNCH', 'SNACK', 'DINNER', 'POST_WORKOUT']
const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: 'Desayuno', PRE_WORKOUT: 'Pre-entreno', LUNCH: 'Almuerzo',
  SNACK: 'Snack', DINNER: 'Cena', POST_WORKOUT: 'Post-entreno',
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

function formatWeekRange(mondayStr: string): string {
  const start = new Date(`${mondayStr}T00:00:00Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  const fmt = (d: Date) => `${d.getUTCDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getUTCMonth()]}`
  return `${fmt(start)} – ${fmt(end)}`
}

function calcKcal(food: { kcalPer100g: number }, grams: number) {
  return Math.round(food.kcalPer100g * grams / 100)
}

// ── AddFoodSheet (simple version for planner) ────────────────────────────────

const QUICK_GRAMS = [50, 100, 150, 200]

function AddFoodSheet({
  visible, mealType, onAdd, onClose,
}: {
  visible: boolean; mealType: string
  onAdd: (foodId: string, grams: number) => void; onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [grams, setGrams] = useState(100)

  const { data: allFoods, isLoading } = useQuery({
    queryKey: ['foods-all'], queryFn: getFoods, staleTime: 5 * 60_000,
  })

  const filtered = query.length >= 2
    ? (allFoods ?? []).filter(f => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : (allFoods ?? []).slice(0, 8)

  function handleAdd() {
    if (!selected) return
    onAdd(selected.id, grams)
    setSelected(null); setQuery(''); setGrams(100)
  }

  function handleClose() { setSelected(null); setQuery(''); setGrams(100); onClose() }

  if (selected) {
    const macros = {
      kcal: Math.round(selected.kcalPer100g * grams / 100),
      prot: Math.round(selected.proteinPer100g * grams / 100 * 10) / 10,
    }
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 }}>
              <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="arrow-back" size={22} color="#374151" />
                </TouchableOpacity>
                <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827' }}>{selected.name}</Text>
                <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={22} color="#9ca3af" /></TouchableOpacity>
              </View>
              <View style={{ paddingHorizontal: 16, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
                  <TextInput value={String(grams)} onChangeText={t => setGrams(Math.max(1, Number(t) || 0))} keyboardType="numeric"
                    style={{ flex: 1, fontSize: 28, fontFamily: 'Inter_900Black', color: '#111827' }} />
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>g</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {QUICK_GRAMS.map(g => (
                    <TouchableOpacity key={g} onPress={() => setGrams(g)}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: grams === g ? '#1e3a5f' : '#e2e8f0', backgroundColor: grams === g ? '#eff6ff' : 'white' }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: grams === g ? '#1e3a5f' : '#6b7280' }}>{g}g</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#ea580c' }}>{macros.kcal}</Text>
                    <Text style={{ fontSize: 9, color: '#9ca3af' }}>kcal</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>{macros.prot}g</Text>
                    <Text style={{ fontSize: 9, color: '#9ca3af' }}>proteina</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleAdd} style={{ backgroundColor: '#1e3a5f', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: 'white' }}>
                    Agregar {grams}g de {selected.name} →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 34 }}>
          <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#111827' }}>Agregar alimento</Text>
            <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={22} color="#9ca3af" /></TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 14 }}>
              <Ionicons name="search" size={16} color="#9ca3af" />
              <TextInput value={query} onChangeText={setQuery} placeholder="Buscar alimento..." placeholderTextColor="#94a3b8" autoFocus
                style={{ flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#0f172a' }} />
            </View>
          </View>
          <ScrollView style={{ maxHeight: 350 }} keyboardShouldPersistTaps="handled">
            {isLoading && <ActivityIndicator color="#f97316" style={{ marginTop: 20 }} />}
            <View style={{ paddingHorizontal: 16 }}>
              {filtered.map(food => (
                <TouchableOpacity key={food.id} onPress={() => { setSelected(food); setGrams(food.servingG || 100) }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{food.name}</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{food.kcalPer100g} kcal / 100g</Text>
                  </View>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="add" size={16} color="white" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function NutritionWeekPlannerScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const params = useLocalSearchParams<{ templateId?: string; weekStart?: string }>()

  const [weekOffset, setWeekOffset] = useState(0)
  const mondayStr = params.weekStart ?? getMondayStr(weekOffset)
  const weekDays = useMemo(() => getWeekDays(mondayStr), [mondayStr])
  const today = new Date().toISOString().split('T')[0]

  const [selectedDay, setSelectedDay] = useState(weekDays.find(d => d === today) ?? weekDays[0])
  const [addingMealType, setAddingMealType] = useState<string | null>(null)

  // Fetch planned meals for week
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['planned-meals-week', mondayStr],
    queryFn: () => getPlannedMealsWeek(mondayStr),
  })

  const { data: pageData } = useQuery({ queryKey: ['nutrition-page'], queryFn: getNutritionPage })

  const meals = data?.meals ?? {}
  const dayMeals = meals[selectedDay] ?? []
  const daysPlanned = weekDays.filter(d => (meals[d]?.length ?? 0) > 0).length

  // Group by meal type
  const grouped = MEAL_ORDER.reduce<Record<string, PlannedMealItem[]>>((acc, mt) => {
    acc[mt] = dayMeals.filter(m => m.mealType === mt)
    return acc
  }, {})

  // Totals for day
  const dayTotal = dayMeals.reduce((sum, m) => sum + calcKcal(m.food, m.grams), 0)
  const targetKcal = pageData?.macros?.kcal ?? 2850

  // Apply template if coming from day builder
  const { mutate: applyTemplate, isPending: applying } = useMutation({
    mutationFn: () => {
      if (!params.templateId) throw new Error('No template')
      const intensityMap: Record<string, 'HARD' | 'EASY' | 'REST'> = {}
      for (const d of weekDays) { intensityMap[d] = 'EASY' }
      return applyNutritionTemplate(params.templateId, { weekStart: mondayStr, intensityMap })
    },
    onSuccess: (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      refetch()
      Alert.alert('Listo', `${res.created} comidas planificadas.`)
    },
    onError: () => Alert.alert('Error', 'No se pudo aplicar la plantilla.'),
  })

  // Create planned meal
  const { mutate: addMeal } = useMutation({
    mutationFn: (p: { foodId: string; grams: number }) =>
      createPlannedMeal({ date: selectedDay, mealType: addingMealType!, foodId: p.foodId, grams: p.grams }),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      qc.invalidateQueries({ queryKey: ['planned-meals-week', mondayStr] })
      setAddingMealType(null)
    },
    onError: () => Alert.alert('Error', 'No se pudo agregar.'),
  })

  // Delete planned meal
  const { mutate: removeMeal } = useMutation({
    mutationFn: deletePlannedMeal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planned-meals-week', mondayStr] }),
  })

  function handleWeekChange(dir: number) {
    setWeekOffset(prev => prev + dir)
    const newMonday = getMondayStr(weekOffset + dir)
    const newDays = getWeekDays(newMonday)
    setSelectedDay(newDays[0])
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1e3a5f', paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: 'white', flex: 1 }}>Nutricion</Text>
        </View>
        {/* Date + Day type badges */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' }}>
              {new Date(selectedDay + 'T12:00:00Z').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#ea580c', borderRadius: 10, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'white' }}>🔥 Dia Duro</Text>
          </View>
        </View>

        {/* Week navigation */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 }}>
          <TouchableOpacity onPress={() => handleWeekChange(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={18} color="white" />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
            Semana · {formatWeekRange(mondayStr)}
          </Text>
          <TouchableOpacity onPress={() => handleWeekChange(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Week strip */}
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
            {weekDays.map((d, i) => {
              const isSelected = d === selectedDay
              const hasMeals = (meals[d]?.length ?? 0) > 0
              const dayNum = new Date(`${d}T12:00:00Z`).getUTCDate()
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => { setSelectedDay(d); Haptics.selectionAsync() }}
                  style={{ alignItems: 'center', gap: 4, flex: 1 }}
                >
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: isSelected ? '#1e3a5f' : '#9ca3af' }}>
                    {DAY_SHORT[i]}
                  </Text>
                  <View style={{
                    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSelected ? '#1e3a5f' : hasMeals ? '#22c55e' : '#f3f4f6',
                  }}>
                    <Text style={{
                      fontSize: 14, fontFamily: 'Inter_700Bold',
                      color: isSelected ? 'white' : hasMeals ? 'white' : '#9ca3af',
                    }}>
                      {dayNum}
                    </Text>
                  </View>
                  {hasMeals && !isSelected && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#22c55e' }} />}
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Days planned progress */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Dias planificados</Text>
            <Text style={{ fontSize: 15, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>{daysPlanned} / 7</Text>
          </View>
          <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: 4, backgroundColor: '#22c55e', borderRadius: 2, width: `${(daysPlanned / 7) * 100}%` }} />
          </View>

          {/* Day content */}
          {dayMeals.length === 0 ? (
            // Empty day state (Figma 4944:89)
            <View style={{ backgroundColor: '#fff7ed', borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#fed7aa' }}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#111827', textAlign: 'center', marginTop: 12 }}>
                Sin comidas planificadas
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', marginTop: 8 }}>
                {new Date(selectedDay + 'T12:00:00Z').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
                Agrega comidas desde tu plantilla o personaliza este dia.
              </Text>

              {params.templateId && (
                <TouchableOpacity
                  onPress={() => applyTemplate()}
                  disabled={applying}
                  style={{ backgroundColor: '#ea580c', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, marginTop: 16, opacity: applying ? 0.7 : 1 }}
                >
                  {applying
                    ? <ActivityIndicator color="white" />
                    : <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: 'white' }}>Aplicar plantilla</Text>
                  }
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setAddingMealType('BREAKFAST')}
                style={{ marginTop: 12 }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>
                  o agregar comidas manualmente
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Meals list
            <View style={{ gap: 8 }}>
              {MEAL_ORDER.map(mealType => {
                const items = grouped[mealType] ?? []
                if (items.length === 0) return null
                const mealKcal = items.reduce((s, m) => s + calcKcal(m.food, m.grams), 0)
                return (
                  <View key={mealType} style={{ backgroundColor: 'white', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                        {MEAL_LABELS[mealType] ?? mealType}
                      </Text>
                      <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#ea580c' }}>{mealKcal} kcal</Text>
                    </View>
                    {items.map(item => (
                      <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#374151' }}>{item.food.name}</Text>
                          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                            {item.food.servingLabel ? `${item.food.servingLabel} (${item.grams}g)` : `${item.grams}g`}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>
                          {calcKcal(item.food, item.grams)} kcal
                        </Text>
                        <TouchableOpacity onPress={() => removeMeal(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={16} color="#d1d5db" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )
              })}

              {/* Add to day */}
              <TouchableOpacity
                onPress={() => setAddingMealType('BREAKFAST')}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  backgroundColor: 'white', borderRadius: 14, paddingVertical: 14,
                  borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#d1d5db',
                }}
              >
                <Ionicons name="add" size={16} color="#6b7280" />
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>Agregar comida al dia</Text>
              </TouchableOpacity>

              {/* Day total */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#374151' }}>Total</Text>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#ea580c' }}>{dayTotal.toLocaleString()} kcal</Text>
              </View>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'right', marginTop: -4 }}>
                Objetivo: {targetKcal.toLocaleString()} kcal · Faltan {Math.max(0, targetKcal - dayTotal).toLocaleString()} kcal
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Bottom CTA: Publicar semana */}
      {daysPlanned > 0 && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f3f4f6',
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12,
        }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              Alert.alert('Semana publicada', `${daysPlanned} dias con comidas planificadas.`, [
                { text: 'Volver a nutricion', onPress: () => router.push('/(app)/(tabs)/nutrition' as any) },
              ])
            }}
            style={{ backgroundColor: '#ea580c', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: 'white' }}>Publicar semana →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Food Sheet */}
      {addingMealType && (
        <AddFoodSheet
          visible={!!addingMealType}
          mealType={addingMealType}
          onAdd={(foodId, grams) => addMeal({ foodId, grams })}
          onClose={() => setAddingMealType(null)}
        />
      )}
    </View>
  )
}
