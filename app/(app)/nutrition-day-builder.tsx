// Pantalla 2: Constructor — Plantilla por tipo de dia
// Figma: 4523:3224 "Nutricion — Mobile · Constructor: Plantilla por tipo de dia"
// Tabs Duro/Facil/Descanso, comidas expandibles con alimentos, + Agregar alimento

import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { getNutritionTemplates, getFoods, getNutritionPage, createNutritionTemplate, addTemplateMealItem, getMealTemplates } from '../../src/api/nutrition'
import type { NutritionTemplate, FoodItem, MealTemplate } from '../../src/api/nutrition'

// ── Types & Constants ────────────────────────────────────────────────────────

type DayType = 'HARD' | 'EASY' | 'REST'
type MealType = 'BREAKFAST' | 'PRE_WORKOUT' | 'LUNCH' | 'SNACK' | 'DINNER' | 'POST_WORKOUT'

const DAY_TABS: { value: DayType; label: string; icon: string; bg: string; border: string; text: string }[] = [
  { value: 'HARD', label: 'Duro', icon: '🔥', bg: '#1e3a5f', border: '#1e3a5f', text: 'white' },
  { value: 'EASY', label: 'Fácil', icon: '✅', bg: '#f0fdf4', border: '#86efac', text: '#16a34a' },
  { value: 'REST', label: 'Descanso', icon: '😴', bg: '#f9fafb', border: '#d1d5db', text: '#6b7280' },
]

const MEAL_ORDER: MealType[] = ['BREAKFAST', 'PRE_WORKOUT', 'LUNCH', 'SNACK', 'DINNER', 'POST_WORKOUT']
const MEAL_LABELS: Record<MealType, { label: string; icon: string }> = {
  BREAKFAST: { label: 'Desayuno', icon: '🌅' },
  PRE_WORKOUT: { label: 'Pre-entreno', icon: '⚡' },
  LUNCH: { label: 'Almuerzo', icon: '🍽️' },
  SNACK: { label: 'Snack', icon: '🍎' },
  DINNER: { label: 'Cena', icon: '🌙' },
  POST_WORKOUT: { label: 'Post-entreno', icon: '💪' },
}

const FOOD_CATEGORY_EMOJI: Record<string, string> = {
  PROTEIN: '🍗', CARB: '🍚', FAT: '🫒', VEGETABLE: '🥦',
  FRUIT: '🍌', DAIRY: '🥛', LEGUME: '🫘', NUT_SEED: '🥜', OTHER: '🥄',
}

const QUICK_GRAMS = [50, 80, 100, 150, 200]

function calcMacros(food: { kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number }, grams: number) {
  const f = grams / 100
  return {
    kcal: Math.round(food.kcalPer100g * f),
    proteinG: Math.round(food.proteinPer100g * f * 10) / 10,
    carbsG: Math.round(food.carbsPer100g * f * 10) / 10,
    fatG: Math.round(food.fatPer100g * f * 10) / 10,
  }
}

// ── AddFoodModal ─────────────────────────────────────────────────────────────

function AddFoodModal({
  visible, mealType, dayType, onAdd, onClose,
}: {
  visible: boolean; mealType: MealType; dayType: DayType
  onAdd: (food: FoodItem, grams: number) => void; onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [grams, setGrams] = useState(100)

  const { data: allFoods, isLoading } = useQuery({
    queryKey: ['foods-all'],
    queryFn: getFoods,
    staleTime: 5 * 60_000,
  })

  const { data: templatesData } = useQuery({
    queryKey: ['meal-templates'],
    queryFn: getMealTemplates,
    staleTime: 5 * 60_000,
  })

  const savedCombos = templatesData?.templates ?? []

  const filtered = query.length >= 2
    ? (allFoods ?? []).filter(f => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
    : (allFoods ?? []).slice(0, 8)

  const macros = selected ? calcMacros(selected, grams) : null

  function handleAdd() {
    if (!selected) return
    onAdd(selected, grams)
    setSelected(null)
    setQuery('')
    setGrams(100)
  }

  function handleClose() {
    setSelected(null)
    setQuery('')
    setGrams(100)
    onClose()
  }

  const dayLabel = dayType === 'HARD' ? 'Día Duro 🔥' : dayType === 'EASY' ? 'Día Fácil ✅' : 'Descanso 😴'
  const mealLabel = MEAL_LABELS[mealType]?.label ?? mealType

  if (selected) {
    // Step 2: Quantity selector (Figma 4961:147)
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 }}>
              <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' }} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
                <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18, fontFamily: 'Inter_400Regular', color: '#374151' }}>←</Text>
                </TouchableOpacity>
                <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                  {selected.name}
                </Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Divider (Figma y=72) */}
              <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />

              <View style={{ paddingHorizontal: 16, gap: 16 }}>
                {/* Food info */}
                <View style={{ backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f2f5fa', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{FOOD_CATEGORY_EMOJI[selected.category] ?? '🥄'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{selected.name}</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                      {selected.kcalPer100g} kcal · {selected.proteinPer100g}g prot · {selected.carbsPer100g}g carb · {selected.fatPer100g}g grasa por 100g
                    </Text>
                  </View>
                </View>

                {/* Grams input */}
                <View>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6b7280', marginBottom: 8 }}>Cantidad (gramos)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#1f3b5e', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
                    <TextInput
                      value={String(grams)}
                      onChangeText={t => setGrams(Math.max(1, Number(t) || 0))}
                      keyboardType="numeric"
                      style={{ flex: 1, fontSize: 28, fontFamily: 'Inter_900Black', color: '#111827' }}
                    />
                    <Text style={{ fontSize: 16, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>g</Text>
                  </View>
                </View>

                {/* Quick grams chips */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {QUICK_GRAMS.map(g => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setGrams(g)}
                      style={{
                        flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                        borderWidth: 1.5,
                        borderColor: grams === g ? '#1e3a5f' : '#e2e8f0',
                        backgroundColor: grams === g ? '#eff6ff' : 'white',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: grams === g ? '#1e3a5f' : '#6b7280' }}>{g}g</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Macro preview */}
                {macros && (
                  <View>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                      Aporte nutricional · {grams}g
                    </Text>
                    <View style={{ backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginRight: 14 }}>
                        <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#111827' }}>{macros.kcal}</Text>
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginLeft: 3 }}>kcal</Text>
                      </View>
                      <View style={{ width: 1, height: 32, backgroundColor: '#e5e7eb', marginRight: 14 }} />
                      {[
                        { label: 'Proteína', value: `${macros.proteinG}g`, color: '#3b82f6' },
                        { label: 'Carbos', value: `${macros.carbsG}g`, color: '#eab308' },
                        { label: 'Grasas', value: `${macros.fatG}g`, color: '#22c55e' },
                      ].map(m => (
                        <View key={m.label} style={{ alignItems: 'center', flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.color }} />
                            <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#374151' }}>{m.value}</Text>
                          </View>
                          <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{m.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Divider before footer */}
                <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />

                {/* Agregar a... */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>Agregar a</Text>
                  <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>{mealLabel}</Text>
                  </View>
                </View>

                {/* CTA */}
                <TouchableOpacity
                  onPress={handleAdd}
                  style={{ backgroundColor: '#1e3a5f', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: 'white' }}>
                    Agregar {grams}g de {selected.name} al {mealLabel} →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    )
  }

  // Step 1: Food search (Figma 4961:43)
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 34 }}>
          <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#111827' }}>Agregar alimento</Text>
            <TouchableOpacity onPress={handleClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f2f5f7', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Divider (Figma y=74) */}
          <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />

          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>
              {MEAL_LABELS[mealType]?.icon ?? '🍳'} {mealLabel} · {dayLabel}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 14 }}>
              <Ionicons name="search" size={16} color="#9ca3af" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar alimento..."
                placeholderTextColor="#94a3b8"
                autoFocus
                style={{ flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#0f172a' }}
              />
              <Ionicons name="camera-outline" size={20} color="#9ca3af" />
            </View>
          </View>

          <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
            {isLoading && <ActivityIndicator color="#f97316" style={{ marginTop: 20 }} />}

            {!isLoading && filtered.length > 0 && (
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.65, marginBottom: 8 }}>
                  {query.length >= 2 ? 'Resultados' : 'Tus alimentos'}
                </Text>
                {filtered.map((food, idx) => (
                  <View key={food.id}>
                    <TouchableOpacity
                      onPress={() => { setSelected(food); setGrams(food.servingG || 100) }}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f2f5fa', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16 }}>{FOOD_CATEGORY_EMOJI[food.category] ?? '🥄'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{food.name}</Text>
                        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                          {food.kcalPer100g} kcal / 100g
                        </Text>
                      </View>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, fontFamily: 'Inter_400Regular', color: 'white' }}>+</Text>
                      </View>
                    </TouchableOpacity>
                    {idx < filtered.length - 1 && (
                      <View style={{ height: 1, backgroundColor: '#f3f4f6', marginLeft: 48 }} />
                    )}
                  </View>
                ))}
              </View>
            )}
            {/* Section divider (Figma SectionDivider y=260) */}
            {savedCombos.length > 0 && !query && <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />}
            {/* Combinaciones guardadas */}
            {savedCombos.length > 0 && !query && (
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.65, marginBottom: 8 }}>
                  Combinaciones guardadas
                </Text>
                {savedCombos.map(t => {
                  const comboKcal = t.items.reduce((s, i) => s + Math.round(i.food.kcalPer100g * i.grams / 100), 0)
                  const comboProt = t.items.reduce((s, i) => s + Math.round(i.food.proteinPer100g * i.grams / 100), 0)
                  const comboCarbs = t.items.reduce((s, i) => s + Math.round(i.food.carbsPer100g * i.grams / 100), 0)
                  const comboFat = t.items.reduce((s, i) => s + Math.round(i.food.fatPer100g * i.grams / 100), 0)
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => {/* TODO: apply combo */}}
                      style={{
                        flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
                        borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
                      }}
                    >
                      <View style={{ width: 3, height: 44, borderRadius: 2, backgroundColor: '#eb590d', marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{t.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{comboKcal} kcal</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6' }} />
                            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{comboProt}P</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#eab308' }} />
                            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{comboCarbs}C</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' }} />
                            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{comboFat}G</Text>
                          </View>
                        </View>
                      </View>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, fontFamily: 'Inter_400Regular', color: 'white' }}>+</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer divider (Figma y=693) */}
          <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />

          {/* Proponer nuevo */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <TouchableOpacity
              onPress={handleClose}
              style={{ backgroundColor: '#1e3a5f', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: 'white' }}>+ Proponer nuevo alimento</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Main Screen ──────────────────────────────────────────────────────────────

type LocalItem = { tempId: string; foodId: string; food: FoodItem; grams: number }
type DayMeals = Record<MealType, LocalItem[]>

function emptyDayMeals(): DayMeals {
  return { BREAKFAST: [], PRE_WORKOUT: [], LUNCH: [], SNACK: [], DINNER: [], POST_WORKOUT: [] }
}

export default function NutritionDayBuilderScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()

  const [activeDayType, setActiveDayType] = useState<DayType>('HARD')
  const [mealsPerDay, setMealsPerDay] = useState<Record<DayType, DayMeals>>({
    HARD: emptyDayMeals(), EASY: emptyDayMeals(), REST: emptyDayMeals(),
  })
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>('BREAKFAST')
  const [addingTo, setAddingTo] = useState<MealType | null>(null)
  const [templateName, setTemplateName] = useState('Mi Menu Nutricional')

  const { data: pageData } = useQuery({ queryKey: ['nutrition-page'], queryFn: getNutritionPage })

  // Load existing templates to check if one exists
  const { data: templatesData } = useQuery({
    queryKey: ['nutrition-templates'],
    queryFn: getNutritionTemplates,
  })

  const currentDayMeals = mealsPerDay[activeDayType]

  // Totals for current day type
  const dayTotals = MEAL_ORDER.reduce(
    (acc, mt) => {
      for (const item of currentDayMeals[mt]) {
        const m = calcMacros(item.food, item.grams)
        acc.kcal += m.kcal; acc.proteinG += m.proteinG; acc.carbsG += m.carbsG; acc.fatG += m.fatG
      }
      return acc
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )

  const dayKey = activeDayType === 'HARD' ? 'hard' : activeDayType === 'EASY' ? 'easy' : 'rest'
  const dayTarget = pageData?.dayTargets?.[dayKey as keyof NonNullable<typeof pageData.dayTargets>]
  const targetKcal = dayTarget?.kcal ?? 0
  const targetProtein = dayTarget?.proteinG ?? 0
  const targetCarbs = dayTarget?.carbsG ?? 0
  const targetFat = dayTarget?.fatG ?? 0

  function handleAddFood(food: FoodItem, grams: number) {
    if (!addingTo) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const tempId = `${Date.now()}-${Math.random()}`
    setMealsPerDay(prev => ({
      ...prev,
      [activeDayType]: {
        ...prev[activeDayType],
        [addingTo]: [...prev[activeDayType][addingTo], { tempId, foodId: food.id, food, grams }],
      },
    }))
    setAddingTo(null)
  }

  function handleRemoveFood(mealType: MealType, tempId: string) {
    setMealsPerDay(prev => ({
      ...prev,
      [activeDayType]: {
        ...prev[activeDayType],
        [mealType]: prev[activeDayType][mealType].filter(i => i.tempId !== tempId),
      },
    }))
  }

  const configuredMeals = MEAL_ORDER.filter(mt => currentDayMeals[mt].length > 0).length

  // Save: create NutritionTemplate via mobile API, then navigate to weekly planner
  const { mutate: saveAndApply, isPending: saving } = useMutation({
    mutationFn: async () => {
      const res = await createNutritionTemplate({ name: templateName })
      const templateId = res.template.id

      for (const dayType of ['HARD', 'EASY', 'REST'] as DayType[]) {
        const dayMeals = mealsPerDay[dayType]
        for (const mealType of MEAL_ORDER) {
          for (const item of dayMeals[mealType]) {
            await addTemplateMealItem(templateId, { dayType, mealType, foodId: item.foodId, grams: item.grams })
          }
        }
      }

      return templateId
    },
    onSuccess: (templateId) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      qc.invalidateQueries({ queryKey: ['nutrition-templates'] })
      router.push(`/(app)/nutrition-week-planner?templateId=${templateId}` as any)
    },
    onError: () => Alert.alert('Error', 'No se pudo guardar el menu.'),
  })

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1e3a5f', paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: 'white', flex: 1 }}>Nutrición</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' }}>
              {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#ea580c', borderRadius: 10, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
              {activeDayType === 'HARD' ? '🔥 Día Duro' : activeDayType === 'EASY' ? '✅ Día Fácil' : '😴 Descanso'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#111827' }}>Menú nutricional</Text>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 8 }}>
            Define las comidas para cada tipo de día
          </Text>
        </View>

        {/* Day type tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 22, padding: 3 }}>
          {DAY_TABS.map(tab => {
            const isActive = activeDayType === tab.value
            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => { setActiveDayType(tab.value); Haptics.selectionAsync() }}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center',
                  backgroundColor: isActive ? tab.bg : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: isActive ? tab.text : '#9ca3af' }}>
                  {tab.icon} {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Configuring banner */}
        <View style={{ backgroundColor: '#f5f7fc', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#d9e0ed' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>
            {activeDayType === 'HARD' ? '🔥' : activeDayType === 'EASY' ? '✅' : '😴'} Configurando: {activeDayType === 'HARD' ? 'Día Duro' : activeDayType === 'EASY' ? 'Día Fácil' : 'Descanso'}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6a7788', marginTop: 2 }}>
            {activeDayType === 'HARD' ? 'Sesiones de alta intensidad' : activeDayType === 'EASY' ? 'Sesiones de baja intensidad' : 'Días sin entrenamiento'}
          </Text>
        </View>

        {/* Macros summary */}
        <View style={{ backgroundColor: '#fff7ed', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#fed7aa' }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            Macros · {activeDayType === 'HARD' ? 'Día Duro' : activeDayType === 'EASY' ? 'Día Fácil' : 'Descanso'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Kcal', value: dayTotals.kcal, target: targetKcal, color: '#ea580c', subLabel: 'objetivo' },
              { label: 'P', value: dayTotals.proteinG, target: targetProtein, color: '#3b82f6', suffix: 'g', subLabel: 'proteína' },
              { label: 'C', value: dayTotals.carbsG, target: targetCarbs, color: '#eab308', suffix: 'g', subLabel: 'carbos' },
              { label: 'G', value: dayTotals.fatG, target: targetFat, color: '#22c55e', suffix: 'g', subLabel: 'grasas' },
            ].map(m => {
              const pct = m.target > 0 ? Math.min((m.value / m.target) * 100, 100) : 0
              return (
                <View key={m.label} style={{ flex: 1, alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>{m.label}</Text>
                  <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: m.color, marginTop: 2 }}>
                    {m.suffix ? `${Math.round(m.value * 10) / 10}${m.suffix}` : m.value.toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#d1d5db' }}>
                    {m.subLabel}
                  </Text>
                  <View style={{ width: '100%', height: 4, backgroundColor: '#f3f4f6', borderRadius: 2, marginTop: 4 }}>
                    <View style={{ width: `${pct}%`, height: 4, backgroundColor: m.color, borderRadius: 2 }} />
                  </View>
                </View>
              )
            })}
          </View>
        </View>

        {/* Meal slots */}
        <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Comidas configuradas
        </Text>

        {/* Unified MealList card (Figma MealList 358×474 — one card for all meals) */}
        <View style={{ backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
          {MEAL_ORDER.map((mealType, idx) => {
            const items = currentDayMeals[mealType]
            const isExpanded = expandedMeal === mealType
            const mealMacros = items.reduce((acc, i) => {
              const m = calcMacros(i.food, i.grams)
              return { kcal: acc.kcal + m.kcal, proteinG: acc.proteinG + m.proteinG }
            }, { kcal: 0, proteinG: 0 })

            return (
              <View key={mealType}>
                {idx > 0 && <View style={{ height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 }} />}
                <TouchableOpacity
                  onPress={() => setExpandedMeal(isExpanded ? null : mealType)}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
                >
                  <Text style={{ fontSize: 16 }}>{MEAL_LABELS[mealType].icon}</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{MEAL_LABELS[mealType].label}</Text>
                    {items.length > 0 && !isExpanded && (
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 1 }}>
                        {items.map(i => i.food.name).join(' + ')}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: items.length > 0 ? '#ea580c' : '#d1d5db', marginRight: 8 }}>
                    {items.length > 0 ? `${mealMacros.kcal} kcal` : '—'}
                  </Text>
                  <Text style={{ fontSize: 16, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>
                    {isExpanded ? '⌄' : '›'}
                  </Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                    {items.map((item, foodIdx) => {
                      const m = calcMacros(item.food, item.grams)
                      return (
                        <View key={item.tempId}>
                          {foodIdx > 0 && <View style={{ height: 1, backgroundColor: '#f3f4f6', marginVertical: 6 }} />}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>
                                {item.food.name}
                              </Text>
                              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{item.grams}g</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>{m.kcal} kcal</Text>
                            <TouchableOpacity onPress={() => handleRemoveFood(mealType, item.tempId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#d1d5db' }}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )
                    })}

                    <TouchableOpacity
                      onPress={() => setAddingTo(mealType)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                        paddingVertical: 10, borderRadius: 10, marginTop: 8,
                        borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#d1d5db',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>+ Agregar alimento</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })}

          {/* Bottom add-meal shortcut (Figma 4523:3285 — inside MealList card) */}
          <View style={{ height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 }} />
          <TouchableOpacity
            onPress={() => {
              const firstEmpty = MEAL_ORDER.find(mt => currentDayMeals[mt].length === 0)
              setExpandedMeal(firstEmpty ?? 'BREAKFAST')
              setAddingTo(firstEmpty ?? 'BREAKFAST')
            }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
          >
            <Text style={{ fontSize: 16, marginRight: 10 }}>➕</Text>
            <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>Agregar comida</Text>
            <Text style={{ fontSize: 16, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f3f4f6',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12,
      }}>
        <TouchableOpacity
          onPress={() => saveAndApply()}
          disabled={saving || dayTotals.kcal === 0}
          style={{
            backgroundColor: dayTotals.kcal === 0 ? '#d1d5db' : '#ea580c',
            borderRadius: 16, paddingVertical: 16, alignItems: 'center',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: 'white' }}>
                Guardar menú →
              </Text>
          }
        </TouchableOpacity>
      </View>

      {/* Add Food Modal (Step 1 + Step 2) */}
      {addingTo && (
        <AddFoodModal
          visible={!!addingTo}
          mealType={addingTo}
          dayType={activeDayType}
          onAdd={handleAddFood}
          onClose={() => setAddingTo(null)}
        />
      )}
    </View>
  )
}
