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
import { getNutritionTemplates, getFoods, getNutritionPage, createNutritionTemplate, addTemplateMealItem } from '../../src/api/nutrition'
import type { NutritionTemplate, FoodItem } from '../../src/api/nutrition'

// ── Types & Constants ────────────────────────────────────────────────────────

type DayType = 'HARD' | 'EASY' | 'REST'
type MealType = 'BREAKFAST' | 'PRE_WORKOUT' | 'LUNCH' | 'SNACK' | 'DINNER' | 'POST_WORKOUT'

const DAY_TABS: { value: DayType; label: string; icon: string; bg: string; border: string; text: string }[] = [
  { value: 'HARD', label: 'Duro', icon: '🔥', bg: '#1e3a5f', border: '#1e3a5f', text: 'white' },
  { value: 'EASY', label: 'Facil', icon: '✅', bg: '#f0fdf4', border: '#86efac', text: '#16a34a' },
  { value: 'REST', label: 'Descanso', icon: '😴', bg: '#f9fafb', border: '#d1d5db', text: '#6b7280' },
]

const MEAL_ORDER: MealType[] = ['BREAKFAST', 'PRE_WORKOUT', 'LUNCH', 'SNACK', 'DINNER', 'POST_WORKOUT']
const MEAL_LABELS: Record<MealType, { label: string; icon: string }> = {
  BREAKFAST: { label: 'Desayuno', icon: '🍳' },
  PRE_WORKOUT: { label: 'Pre-entreno', icon: '⚡' },
  LUNCH: { label: 'Almuerzo', icon: '🥗' },
  SNACK: { label: 'Snack', icon: '🍎' },
  DINNER: { label: 'Cena', icon: '🍽️' },
  POST_WORKOUT: { label: 'Post-entreno', icon: '💪' },
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

  const dayLabel = dayType === 'HARD' ? 'Dia Duro 🔥' : dayType === 'EASY' ? 'Dia Facil ✅' : 'Descanso 😴'
  const mealLabel = MEAL_LABELS[mealType]?.label ?? mealType

  if (selected) {
    // Step 2: Quantity selector (Figma 4961:147)
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 }}>
              <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' }} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
                <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="arrow-back" size={22} color="#374151" />
                </TouchableOpacity>
                <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                  {selected.name}
                </Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View style={{ paddingHorizontal: 16, gap: 16 }}>
                {/* Food info */}
                <View style={{ backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 28 }}>🥄</Text>
                  <View>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{selected.name}</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                      {selected.kcalPer100g} kcal · {selected.proteinPer100g}g prot · {selected.carbsPer100g}g carb · {selected.fatPer100g}g grasa por 100g
                    </Text>
                  </View>
                </View>

                {/* Grams input */}
                <View>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6b7280', marginBottom: 8 }}>Cantidad (gramos)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
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
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
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
                    <View style={{ backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <View>
                        <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#111827' }}>{macros.kcal}</Text>
                        <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>kcal</Text>
                      </View>
                      {[
                        { label: 'Proteina', value: `${macros.proteinG}g`, color: '#ef4444' },
                        { label: 'Carbos', value: `${macros.carbsG}g`, color: '#3b82f6' },
                        { label: 'Grasas', value: `${macros.fatG}g`, color: '#eab308' },
                      ].map(m => (
                        <View key={m.label} style={{ alignItems: 'center' }}>
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
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#111827' }}>Agregar alimento</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>
              🍳 {mealLabel} · {dayLabel}
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
            </View>
          </View>

          <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
            {isLoading && <ActivityIndicator color="#f97316" style={{ marginTop: 20 }} />}

            {!isLoading && filtered.length > 0 && (
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                  {query.length >= 2 ? 'Resultados' : 'Tus alimentos'}
                </Text>
                {filtered.map(food => (
                  <TouchableOpacity
                    key={food.id}
                    onPress={() => { setSelected(food); setGrams(food.servingG || 100) }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
                      borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{food.name}</Text>
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                        {food.kcalPer100g} kcal / 100g
                      </Text>
                    </View>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="add" size={16} color="white" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

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

  const targetKcal = activeDayType === 'HARD' ? (pageData?.macros?.kcal ?? 2850)
    : activeDayType === 'EASY' ? Math.round((pageData?.macros?.kcal ?? 2850) * 0.77)
    : Math.round((pageData?.macros?.kcal ?? 2850) * 0.63)

  const targetProtein = pageData?.macros?.proteinG ?? 165
  const targetCarbs = activeDayType === 'HARD' ? (pageData?.macros?.carbsG ?? 340) : Math.round((pageData?.macros?.carbsG ?? 340) * 0.7)
  const targetFat = pageData?.macros?.fatG ?? 75

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
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: 'white', flex: 1 }}>Nutricion</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' }}>
              {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#ea580c', borderRadius: 10, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
              {activeDayType === 'HARD' ? '🔥 Dia Duro' : activeDayType === 'EASY' ? '✅ Dia Facil' : '😴 Descanso'}
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
          <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#111827' }}>Menu nutricional</Text>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
            Define las comidas para cada tipo de dia
          </Text>
        </View>

        {/* Day type tabs */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DAY_TABS.map(tab => {
            const isActive = activeDayType === tab.value
            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => { setActiveDayType(tab.value); Haptics.selectionAsync() }}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                  backgroundColor: isActive ? tab.bg : 'white',
                  borderWidth: 1.5, borderColor: isActive ? tab.border : '#e2e8f0',
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
        <View style={{ backgroundColor: '#fff7ed', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#fed7aa' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#92400e' }}>
            {activeDayType === 'HARD' ? '🔥' : activeDayType === 'EASY' ? '✅' : '😴'} Configurando: {activeDayType === 'HARD' ? 'Dia Duro' : activeDayType === 'EASY' ? 'Dia Facil' : 'Descanso'}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#b45309', marginTop: 2 }}>
            {activeDayType === 'HARD' ? 'Sesiones de alta intensidad' : activeDayType === 'EASY' ? 'Sesiones de baja intensidad' : 'Dias sin entrenamiento'}
          </Text>
        </View>

        {/* Macros summary */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            Macros · {activeDayType === 'HARD' ? 'Dia Duro' : activeDayType === 'EASY' ? 'Dia Facil' : 'Descanso'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Kcal', value: dayTotals.kcal, target: targetKcal, color: '#ea580c' },
              { label: 'P', value: dayTotals.proteinG, target: targetProtein, color: '#ef4444', suffix: 'g' },
              { label: 'C', value: dayTotals.carbsG, target: targetCarbs, color: '#3b82f6', suffix: 'g' },
              { label: 'G', value: dayTotals.fatG, target: targetFat, color: '#eab308', suffix: 'g' },
            ].map(m => {
              const pct = m.target > 0 ? Math.min((m.value / m.target) * 100, 100) : 0
              return (
                <View key={m.label} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>{m.label}</Text>
                  <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: m.color, marginTop: 2 }}>
                    {m.suffix ? `${Math.round(m.value * 10) / 10}${m.suffix}` : m.value.toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#d1d5db' }}>
                    {m.label === 'Kcal' ? 'objetivo' : `${m.target}${m.suffix}`}
                  </Text>
                  <View style={{ width: '100%', height: 3, backgroundColor: '#f3f4f6', borderRadius: 2, marginTop: 4 }}>
                    <View style={{ width: `${pct}%`, height: 3, backgroundColor: m.color, borderRadius: 2 }} />
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

        {MEAL_ORDER.map(mealType => {
          const items = currentDayMeals[mealType]
          const isExpanded = expandedMeal === mealType
          const mealMacros = items.reduce((acc, i) => {
            const m = calcMacros(i.food, i.grams)
            return { kcal: acc.kcal + m.kcal, proteinG: acc.proteinG + m.proteinG }
          }, { kcal: 0, proteinG: 0 })

          return (
            <View key={mealType} style={{ backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
              <TouchableOpacity
                onPress={() => setExpandedMeal(isExpanded ? null : mealType)}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 14,
                  borderBottomWidth: isExpanded && items.length > 0 ? 1 : 0, borderBottomColor: '#f3f4f6',
                }}
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
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
              </TouchableOpacity>

              {isExpanded && (
                <View style={{ padding: 14, gap: 8 }}>
                  {items.map(item => {
                    const m = calcMacros(item.food, item.grams)
                    return (
                      <View key={item.tempId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>
                            {item.food.name}
                          </Text>
                          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{item.grams}g</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>{m.kcal} kcal</Text>
                        <TouchableOpacity onPress={() => handleRemoveFood(mealType, item.tempId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={18} color="#d1d5db" />
                        </TouchableOpacity>
                      </View>
                    )
                  })}

                  <TouchableOpacity
                    onPress={() => setAddingTo(mealType)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      paddingVertical: 12, borderRadius: 10,
                      borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#d1d5db',
                    }}
                  >
                    <Ionicons name="add" size={16} color="#6b7280" />
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>Agregar alimento</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )
        })}
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
                Aplicar a esta semana →
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
