import { useState, useMemo } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { getNutrition, getFoodLogs, deleteFoodLog, getWeeklyNutritionSummary, acceptNutritionAdjustment, rejectNutritionAdjustment, getPlannedMeals, logPlannedMeal, swapPlannedMeal, removeSwap, getFoods, getMyProposals, getWaterLog, logWater, type PendingNutritionAdjustment, type PlannedMealItem, type PlannedMealFood, type FoodProposalSummary } from '../../../src/api/nutrition'
import { useAuthStore } from '../../../src/store/auth'
import UpgradeWall from '../../../src/components/UpgradeWall'
import FoodSetupFlow from '../../../src/components/FoodSetupFlow'
import LogFoodModal from '../../../src/components/LogFoodModal'
import ProposeFoodModal from '../../../src/components/ProposeFoodModal'

function getLocalDateString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const DAY_TYPE = {
  hard: { label: 'Día duro', emoji: '🔥', color: '#ea580c' },
  easy: { label: 'Día fácil', emoji: '✅', color: '#16a34a' },
  rest: { label: 'Descanso', emoji: '😴', color: '#2563eb' },
}

const MEAL_ICONS: Record<string, string> = {
  'Pre-entreno': '⚡', 'Recuperación': '🔄', 'Post-entreno': '🔄',
  'Desayuno': '🌅', 'Almuerzo': '☀️', 'Merienda': '🍎',
  'Snack': '🍎', 'Cena': '🌙',
}

// ─── MealPlanSection ─────────────────────────────────────────────────────────

function MealList({ mealPlan, dayType }: { mealPlan: any; dayType: string }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const meals: any[] = dayType === 'hard' ? mealPlan?.hard?.meals
    : dayType === 'rest' ? mealPlan?.rest?.meals
    : mealPlan?.easy?.meals

  if (!meals?.length) return null

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
      <Text style={{
        fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280',
        letterSpacing: 1, textTransform: 'uppercase',
        paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
      }}>
        Mis comidas de hoy · {meals.length} comidas
      </Text>
      {meals.map((meal: any, i: number) => {
        const isOpen = expanded === i
        const icon = MEAL_ICONS[meal.label] ?? '🍽️'
        return (
          <TouchableOpacity
            key={i}
            onPress={() => setExpanded(isOpen ? null : i)}
            activeOpacity={0.7}
            style={{
              borderTopWidth: 1, borderTopColor: '#f3f4f6',
              paddingHorizontal: 20, paddingVertical: 14,
              backgroundColor: isOpen ? '#f8fafc' : 'white',
            }}
          >
            {/* Collapsed row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                    {meal.label}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 1 }}>
                    {meal.time}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#f97316' }}>
                  {meal.kcal} kcal
                </Text>
                <Text style={{ fontSize: 14, color: '#9ca3af' }}>{isOpen ? '▲' : '▼'}</Text>
              </View>
            </View>

            {/* Expanded detail */}
            {isOpen && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#374151', lineHeight: 20 }}>
                  {meal.foods}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <View style={{ backgroundColor: '#dbeafe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#1d4ed8' }}>
                      P {meal.protein}g
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#fef9c3', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#854d0e' }}>
                      C {meal.carbs}g
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#166534' }}>
                      G {meal.fat}g
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── HydrationSection ────────────────────────────────────────────────────────

const WATER_QUICK_ADD = [250, 500, 750]

function HydrationSection({ waterMlTarget: targetFromNutrition }: { waterMlTarget?: number; fallbackL?: number }) {
  const queryClient = useQueryClient()

  const { data: waterData } = useQuery({
    queryKey: ['water-log'],
    queryFn: getWaterLog,
    staleTime: 30_000,
  })

  const { mutate: addWater, isPending } = useMutation({
    mutationFn: (delta: number) => logWater(delta),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      queryClient.invalidateQueries({ queryKey: ['water-log'] })
    },
  })

  const mlLogged = waterData?.mlLogged ?? 0
  const target = waterData?.waterMlTarget ?? targetFromNutrition ?? 2000
  const pct = Math.min(100, Math.round((mlLogged / target) * 100))
  const liters = (mlLogged / 1000).toFixed(1)
  const targetL = (target / 1000).toFixed(1)
  const isGoalReached = mlLogged >= target

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: isGoalReached ? '#86efac' : '#e5e7eb', overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>💧</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>
            Hidratación
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            <Text style={{ fontSize: 24, fontFamily: 'Inter_900Black', color: isGoalReached ? '#16a34a' : '#1e3a5f', letterSpacing: -0.5 }}>
              {liters} L
            </Text>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
              / {targetL} L objetivo
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: isGoalReached ? '#16a34a' : '#6b7280' }}>
          {pct}%
        </Text>
      </View>

      {/* Progress bar */}
      <View style={{ marginHorizontal: 20, marginBottom: 16, height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: isGoalReached ? '#22c55e' : '#3b82f6', borderRadius: 4 }} />
      </View>

      {/* Quick add buttons */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 16 }}>
        {WATER_QUICK_ADD.map(ml => (
          <TouchableOpacity
            key={ml}
            onPress={() => addWater(ml)}
            disabled={isPending}
            style={{
              flex: 1, paddingVertical: 10, borderRadius: 12,
              backgroundColor: '#eff6ff', alignItems: 'center',
              borderWidth: 1, borderColor: '#bfdbfe',
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#1d4ed8' }}>+{ml} ml</Text>
          </TouchableOpacity>
        ))}
        {mlLogged > 0 && (
          <TouchableOpacity
            onPress={() => addWater(-250)}
            disabled={isPending}
            style={{
              paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
              backgroundColor: '#fef2f2', alignItems: 'center',
              borderWidth: 1, borderColor: '#fecaca',
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#ef4444' }}>−</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ─── SupplementsSection ──────────────────────────────────────────────────────

function SupplementsSection({ supplements }: { supplements: { name: string; dose: string; when: string; purpose: string }[] }) {
  if (!supplements?.length) return null
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 }}>
        Suplementación
      </Text>
      {supplements.map((s, i) => (
        <View
          key={i}
          style={{
            borderTopWidth: 1, borderTopColor: '#f3f4f6',
            paddingHorizontal: 20, paddingVertical: 14,
            backgroundColor: i % 2 === 1 ? '#fafafa' : 'white',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{s.name}</Text>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>{s.dose}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>{s.when}</Text>
            </View>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', flex: 1 }} numberOfLines={1}>{s.purpose}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

// ─── RulesSection ─────────────────────────────────────────────────────────────

const RULE_ICONS = ['🕔', '🌙', '🚫', '⚖️', '💊']

function RulesSection({ rules }: { rules: string[] }) {
  if (!rules?.length) return null
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 }}>
        Reglas no negociables
      </Text>
      {rules.map((rule, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 20, paddingVertical: 14 }}>
          <Text style={{ fontSize: 18 }}>{RULE_ICONS[i] ?? '📌'}</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#374151', flex: 1, lineHeight: 20 }}>{rule}</Text>
        </View>
      ))}
    </View>
  )
}

// ─── PlannedMealsSection ─────────────────────────────────────────────────────

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST:    'Desayuno',
  PRE_WORKOUT:  'Pre-entreno',
  LUNCH:        'Almuerzo',
  SNACK:        'Snack',
  DINNER:       'Cena',
  POST_WORKOUT: 'Post-entreno',
}

function calcKcal(food: PlannedMealFood, grams: number): number {
  return Math.round((food.kcalPer100g * grams) / 100)
}

// ─── SwapPicker — inline food selector for swapping a planned meal ────────────

function SwapPicker({
  item,
  allFoods,
  onSwapped,
  onCancel,
}: {
  item: PlannedMealItem
  allFoods: PlannedMealFood[]
  onSwapped: () => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const [swapping, setSwapping] = useState(false)

  const originalKcal = calcKcal(item.food, item.grams)

  const filtered = useMemo(() => {
    if (!query.trim()) return allFoods.slice(0, 20)
    const q = query.toLowerCase()
    return allFoods.filter(f => f.name.toLowerCase().includes(q)).slice(0, 30)
  }, [allFoods, query])

  async function handlePick(food: PlannedMealFood) {
    if (swapping) return
    // Use same grams, check ±10% server-side; adjust grams to match original kcal if off
    const grams = Math.round((originalKcal / food.kcalPer100g) * 100)
    setSwapping(true)
    try {
      await swapPlannedMeal(item.id, food.id, grams)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onSwapped()
    } catch (err: any) {
      Alert.alert('No permitido', err?.message ?? 'Este alimento no es equivalente en calorías (±10%).')
    } finally {
      setSwapping(false)
    }
  }

  return (
    <View style={{ backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>
          Sustituir · {originalKcal} kcal objetivo
        </Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar alimento..."
        placeholderTextColor="#9ca3af"
        style={{
          backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
          paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: 'Inter_400Regular',
          color: '#111827', marginBottom: 8,
        }}
      />
      <View style={{ maxHeight: 200 }}>
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {filtered.map(food => {
            const kcalAtSameGrams = calcKcal(food, item.grams)
            const diff = Math.round(Math.abs(kcalAtSameGrams - originalKcal) / originalKcal * 100)
            const ok = diff <= 10
            return (
              <TouchableOpacity
                key={food.id}
                onPress={() => handlePick(food)}
                disabled={swapping}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 9, paddingHorizontal: 4,
                  borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
                  opacity: swapping ? 0.5 : 1,
                }}
              >
                <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#111827' }} numberOfLines={1}>
                  {food.name}
                </Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: ok ? '#16a34a' : '#9ca3af', marginLeft: 8 }}>
                  {kcalAtSameGrams} kcal
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    </View>
  )
}

function PlannedMealsSection({
  meals,
  allFoods,
  onLogged,
  onSwapped,
}: {
  meals: PlannedMealItem[]
  allFoods: PlannedMealFood[]
  onLogged: () => void
  onSwapped: () => void
}) {
  const [logging, setLogging] = useState<Set<string>>(new Set())
  const [logged, setLogged] = useState<Set<string>>(new Set())
  const [swappingId, setSwappingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleLog(id: string) {
    if (logging.has(id) || logged.has(id)) return
    setLogging(prev => new Set([...prev, id]))
    try {
      await logPlannedMeal(id)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setLogged(prev => new Set([...prev, id]))
      onLogged()
    } catch {
      Alert.alert('Error', 'No se pudo registrar. Intenta de nuevo.')
    } finally {
      setLogging(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  async function handleRemoveSwap(id: string) {
    setRemovingId(id)
    try {
      await removeSwap(id)
      onSwapped()
    } catch {
      Alert.alert('Error', 'No se pudo restaurar el alimento original.')
    } finally {
      setRemovingId(null)
    }
  }

  if (meals.length === 0) return null

  const grouped: Record<string, PlannedMealItem[]> = {}
  for (const m of meals) {
    if (!grouped[m.mealType]) grouped[m.mealType] = []
    grouped[m.mealType].push(m)
  }

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>
          Plan de hoy
        </Text>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
          {meals.length} alimentos
        </Text>
      </View>

      {Object.entries(grouped).map(([mealType, items]) => (
        <View key={mealType}>
          <View style={{ paddingHorizontal: 20, paddingVertical: 6, backgroundColor: '#f8fafc' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#4b5563' }}>
              {MEAL_TYPE_LABELS[mealType] ?? mealType}
            </Text>
          </View>
          {items.map((item) => {
            const isLogging = logging.has(item.id)
            const isDone = logged.has(item.id)
            const hasOverride = item.override !== null
            const activeFood = hasOverride ? item.override!.overrideFood : item.food
            const activeGrams = hasOverride ? item.override!.overrideGrams : item.grams
            const kcal = calcKcal(activeFood, activeGrams)
            const isSwapping = swappingId === item.id
            const isRemoving = removingId === item.id

            return (
              <View key={item.id} style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                <View
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingHorizontal: 20, paddingVertical: 12,
                    backgroundColor: isDone ? '#f0fdf4' : hasOverride ? '#fff7ed' : 'white',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: isDone ? '#16a34a' : '#111827', flex: 1 }} numberOfLines={1}>
                        {activeFood.name}
                      </Text>
                      {hasOverride && (
                        <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#ea580c' }}>cambiado</Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 1 }}>
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                        {activeGrams}g · {kcal} kcal · P{Math.round((activeFood.proteinPer100g * activeGrams) / 100)}g
                      </Text>
                    </View>
                    {!isDone && (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                        <TouchableOpacity
                          onPress={() => setSwappingId(isSwapping ? null : item.id)}
                          activeOpacity={0.7}
                          style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: '#d1d5db' }}
                        >
                          <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>
                            {isSwapping ? 'Cerrar' : 'Cambiar'}
                          </Text>
                        </TouchableOpacity>
                        {hasOverride && (
                          <TouchableOpacity
                            onPress={() => handleRemoveSwap(item.id)}
                            disabled={isRemoving}
                            activeOpacity={0.7}
                            style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: '#fed7aa' }}
                          >
                            <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#ea580c' }}>
                              {isRemoving ? '...' : 'Restaurar'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleLog(item.id)}
                    disabled={isLogging || isDone}
                    activeOpacity={0.75}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
                      backgroundColor: isDone ? '#dcfce7' : '#1e3a5f',
                      opacity: isLogging ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: isDone ? '#16a34a' : 'white' }}>
                      {isDone ? '✓ Listo' : isLogging ? '...' : 'Registrar'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {isSwapping && (
                  <SwapPicker
                    item={item}
                    allFoods={allFoods}
                    onSwapped={() => { setSwappingId(null); onSwapped() }}
                    onCancel={() => setSwappingId(null)}
                  />
                )}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

// ─── TrackingSection ─────────────────────────────────────────────────────────

function TrackingSection({ onAdd }: { onAdd: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['nutrition-log'],
    queryFn: () => getFoodLogs(getLocalDateString()),
    staleTime: 30_000,
  })
  const { mutate: doDelete } = useMutation({
    mutationFn: deleteFoodLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-log'] })
      queryClient.invalidateQueries({ queryKey: ['nutrition-summary'] })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: () => Alert.alert('Error', 'No se pudo eliminar el alimento.'),
  })

  const totals = data?.totals ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  const target = data?.target
  const logs   = data?.logs ?? []

  const kcalPct = target?.kcal ? Math.min(Math.round((totals.kcal / target.kcal) * 100), 100) : 0
  const kcalOver = target?.kcal ? totals.kcal > target.kcal : false

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
      {/* Header row */}
      <TouchableOpacity
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            Lo que comí hoy
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#9ca3af" />
          ) : (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: kcalOver ? '#ef4444' : '#111827', letterSpacing: -0.5 }}>
                  {totals.kcal}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                  {target ? `/ ${target.kcal} kcal` : 'kcal registradas'}
                </Text>
              </View>
              {/* Barra kcal */}
              {target && (
                <View style={{ height: 5, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{
                    height: '100%', width: `${kcalPct}%`,
                    backgroundColor: kcalOver ? '#ef4444' : '#f97316',
                    borderRadius: 4,
                  }} />
                </View>
              )}
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 16 }}>
          <TouchableOpacity
            onPress={onAdd}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ backgroundColor: '#1e3a5f', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ color: 'white', fontSize: 14, fontFamily: 'Inter_700Bold' }}>+ Registrar</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 14, color: '#9ca3af' }}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Expanded: macros + logs */}
      {expanded && !isLoading && (
        <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
          {/* 4 macro bars */}
          {target && (
            <View style={{ gap: 8, paddingTop: 14 }}>
              {([
                { key: 'proteinG', label: 'Proteína', color: '#3b82f6', unit: 'g' },
                { key: 'carbsG',   label: 'Carbos',   color: '#eab308', unit: 'g' },
                { key: 'fatG',     label: 'Grasas',   color: '#22c55e', unit: 'g' },
              ] as const).map(m => {
                const val = totals[m.key] ?? 0
                const tgt = target[m.key] ?? 0
                const pct = tgt > 0 ? Math.min((val / tgt) * 100, 100) : 0
                return (
                  <View key={m.key} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>{m.label}</Text>
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>
                        {val}{m.unit} <Text style={{ color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>/ {tgt}{m.unit}</Text>
                      </Text>
                    </View>
                    <View style={{ height: 5, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: m.color, borderRadius: 4 }} />
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {/* Logs list */}
          {logs.length > 0 ? (
            <View style={{ gap: 2, paddingTop: 4 }}>
              <View style={{ height: 1, backgroundColor: '#f3f4f6', marginBottom: 8 }} />
              {logs.map(log => (
                <View key={log.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#374151' }} numberOfLines={1}>
                      {log.food.name}
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 1 }}>
                      {log.grams}g · {log.kcal} kcal · {log.mealType}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Eliminar', `¿Quitar "${log.food.name}"?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(log.id) },
                      ])
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 4 }}
                  >
                    <Text style={{ fontSize: 16, color: '#ef4444' }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'center', paddingVertical: 8 }}>
              Aún no registras comidas hoy
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

// ─── NutritionAdjustmentCard ─────────────────────────────────────────────────

function NutritionAdjustmentCard({ adj, onAction }: { adj: PendingNutritionAdjustment; onAction: () => void }) {
  const [loading, setLoading] = useState(false)
  const deltaSign = adj.deltaKcal >= 0 ? '+' : ''

  async function handle(action: 'accept' | 'reject') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setLoading(true)
    try {
      if (action === 'accept') {
        await acceptNutritionAdjustment(adj.id)
      } else {
        await rejectNutritionAdjustment(adj.id)
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onAction()
    } catch {
      Alert.alert('Error', 'No se pudo procesar el ajuste. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ backgroundColor: '#fffbeb', borderRadius: 16, borderWidth: 1.5, borderColor: '#fcd34d', padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Text style={{ fontSize: 20 }}>⚡</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#92400e' }}>
            Ajuste nutricional sugerido
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#b45309', marginTop: 2, lineHeight: 18 }}>
            Tu sesión de hoy fue más{adj.deltaKcal > 0 ? ' intensa' : ' suave'} de lo planificado.
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, backgroundColor: '#fef9c3', borderRadius: 10, padding: 10, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#854d0e' }}>
            {deltaSign}{adj.deltaKcal} kcal
          </Text>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#a16207', marginTop: 2 }}>ajuste calorías</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#fef9c3', borderRadius: 10, padding: 10, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#854d0e' }}>
            {deltaSign}{adj.deltaCarbsG}g
          </Text>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#a16207', marginTop: 2 }}>ajuste carbos</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => handle('reject')}
          disabled={loading}
          activeOpacity={0.8}
          style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: 'white' }}
        >
          <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>Ignorar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handle('accept')}
          disabled={loading}
          activeOpacity={0.85}
          style={{ flex: 2, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#f97316' }}
        >
          {loading
            ? <ActivityIndicator color="white" size="small" />
            : <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: 'white' }}>Aceptar ajuste →</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── MyProposalsSection ───────────────────────────────────────────────────────

const PROPOSAL_STATUS: Record<string, { label: string; bg: string; text: string; emoji: string }> = {
  PENDING:  { label: 'En revisión', bg: '#fef9c3', text: '#854d0e', emoji: '⏳' },
  APPROVED: { label: 'Aprobado',    bg: '#f0fdf4', text: '#14532d', emoji: '✅' },
  REJECTED: { label: 'Rechazado',   bg: '#fef2f2', text: '#991b1b', emoji: '❌' },
}

function MyProposalsSection({ proposals }: { proposals: FoodProposalSummary[] }) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 }}>
        Mis propuestas de alimento
      </Text>
      {proposals.map((p, i) => {
        const status = PROPOSAL_STATUS[p.status] ?? PROPOSAL_STATUS.PENDING
        return (
          <View
            key={p.id}
            style={{
              borderTopWidth: 1, borderTopColor: '#f3f4f6',
              paddingHorizontal: 20, paddingVertical: 14,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }} numberOfLines={1}>
                {p.food.name}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                {p.food.kcalPer100g} kcal · {p.food.proteinPer100g}g P · {p.food.carbsPer100g}g C · {p.food.fatPer100g}g G
              </Text>
              {p.reviewNote && (
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 2 }} numberOfLines={2}>
                  Nota: {p.reviewNote}
                </Text>
              )}
            </View>
            <View style={{ backgroundColor: status.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11 }}>{status.emoji}</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: status.text }}>{status.label}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ─── WeeklySummarySection ─────────────────────────────────────────────────────

function WeeklySummarySection() {
  const { data, isLoading } = useQuery({
    queryKey: ['nutrition-summary'],
    queryFn: getWeeklyNutritionSummary,
    staleTime: 5 * 60_000,
  })

  if (isLoading || !data) return null

  const adherence = data.adherencePct
  const adherenceColor = adherence == null ? '#9ca3af'
    : adherence >= 85 ? '#16a34a'
    : adherence >= 60 ? '#f97316'
    : '#ef4444'

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', padding: 18, gap: 14 }}>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>
        Resumen de la semana
      </Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {/* Días registrados */}
        <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
            {data.daysWithLog}
            <Text style={{ fontSize: 13, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>/7</Text>
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>días registrados</Text>
        </View>

        {/* Promedio kcal */}
        <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#f97316', letterSpacing: -1 }}>
            {data.avgKcal > 0 ? data.avgKcal.toLocaleString() : '—'}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>
            kcal promedio{data.targetKcal > 0 ? ` / ${data.targetKcal.toLocaleString()}` : ''}
          </Text>
        </View>
      </View>

      {/* Adherencia */}
      {adherence != null && (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>Adherencia calórica</Text>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: adherenceColor }}>{adherence}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.min(adherence, 100)}%`, backgroundColor: adherenceColor, borderRadius: 4 }} />
          </View>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
            {adherence >= 85 ? 'Excelente consistencia esta semana 💪'
              : adherence >= 60 ? 'Buena semana — sigue sumando días'
              : 'Registra más días para mejorar tu adherencia'}
          </Text>
        </View>
      )}

      {data.daysWithoutLog > 0 && data.daysWithLog > 0 && (
        <View style={{ backgroundColor: '#fef9c3', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 13 }}>💡</Text>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#713f12', flex: 1 }}>
            {data.daysWithoutLog} {data.daysWithoutLog === 1 ? 'día sin registro' : 'días sin registrar'} — registrar todos los días mejora la precisión del plan.
          </Text>
        </View>
      )}
    </View>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const { user } = useAuthStore()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['nutrition'], queryFn: getNutrition })
  const [showSetup, setShowSetup]       = useState(false)
  const [showLogFood, setShowLogFood]   = useState(false)
  const [showPropose, setShowPropose]   = useState(false)
  const { data: proposalsData, refetch: refetchProposals } = useQuery({
    queryKey: ['food-proposals'],
    queryFn: getMyProposals,
    staleTime: 5 * 60_000,
  })
  const { data: plannedMealsData, refetch: refetchPlannedMeals } = useQuery({
    queryKey: ['planned-meals', getLocalDateString()],
    queryFn: () => getPlannedMeals(getLocalDateString()),
    staleTime: 2 * 60_000,
  })
  const { data: allFoodsData } = useQuery({
    queryKey: ['foods'],
    queryFn: getFoods,
    staleTime: 10 * 60_000,
    enabled: (plannedMealsData?.meals?.length ?? 0) > 0,
  })

  if (!user?.features?.nutrition) {
    return <UpgradeWall icon="🥗" title="Plan nutricional" description="Accede a tu plan de nutrición periodizado por tipo de entrenamiento con el plan Pro." />
  }

  const dayType = data?.dayType ?? 'easy'
  const day     = DAY_TYPE[dayType]
  const macros  = data?.macros

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>

      {/* Header */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 22, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Text style={{ color: 'white', fontSize: 28, fontFamily: 'Inter_900Black', letterSpacing: -0.5 }}>
            Nutrición
          </Text>
          {!isLoading && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
                {day.emoji} {day.label}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Sin plan — empty state con CTA */}
          {!data?.hasNutritionPlan && (
            <View style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, padding: 32, alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 40 }}>🥗</Text>
              <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827', textAlign: 'center' }}>
                Sin plan nutricional
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', lineHeight: 20 }}>
                Completa el onboarding para activar tu plan nutricional personalizado.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#1e3a5f', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 4 }}
              >
                <Text style={{ color: 'white', fontSize: 14, fontFamily: 'Inter_700Bold' }}>Completar onboarding</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Ajuste nutricional pendiente */}
          {data?.pendingAdjustment && (
            <NutritionAdjustmentCard
              adj={data.pendingAdjustment}
              onAction={() => queryClient.invalidateQueries({ queryKey: ['nutrition'] })}
            />
          )}

          {/* MOB-NUT-01: contexto de fase del plan */}
          {data?.planPhaseContext && (
            <View style={{
              backgroundColor: '#eff6ff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#bfdbfe',
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
              <Text style={{ fontSize: 18 }}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {data.planPhaseContext}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#3b82f6', marginTop: 2 }}>
                  {data.planPhaseContext === 'Semana de descarga'
                    ? 'Reduce la carga — la nutrición se adapta para recuperación.'
                    : data.planPhaseContext === 'Semana de carga alta'
                      ? 'Semana exigente — prioriza carbohidratos y proteína.'
                      : 'Semana de volumen moderado — mantén consistencia nutricional.'}
                </Text>
              </View>
            </View>
          )}

          {data?.hasNutritionPlan && macros && (
            <>
              {/* ── 1. Hero: progreso del día (kcal consumidas vs target) ── */}
              <TrackingSection onAdd={() => setShowLogFood(true)} />

              {/* ── 1b. Plan de hoy — alimentos asignados por coach o planificados ── */}
              {(plannedMealsData?.meals ?? []).length > 0 && (
                <PlannedMealsSection
                  meals={plannedMealsData!.meals}
                  allFoods={allFoodsData ?? []}
                  onLogged={() => {
                    queryClient.invalidateQueries({ queryKey: ['nutrition-log'] })
                    queryClient.invalidateQueries({ queryKey: ['nutrition-summary'] })
                    refetchPlannedMeals()
                  }}
                  onSwapped={() => refetchPlannedMeals()}
                />
              )}

              {/* ── 2. Resumen semanal de adherencia ── */}
              <WeeklySummarySection />

              {/* ── 2b. Mis propuestas de alimento ── */}
              {(proposalsData?.proposals ?? []).length > 0 && (
                <MyProposalsSection proposals={proposalsData!.proposals} />
              )}

              {/* ── 3. Objetivo de macros del día ── */}
              <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', padding: 20 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                  Tu objetivo de hoy
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                  <Text style={{ fontSize: 42, fontFamily: 'Inter_900Black', color: '#f97316', letterSpacing: -1.5 }}>
                    {macros.kcal.toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_400Regular', color: '#9ca3af', paddingBottom: 4 }}>
                    kcal
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { label: 'Proteína', value: macros.proteinG, unit: 'g', color: '#3b82f6', bg: '#dbeafe' },
                    { label: 'Carbos',   value: macros.carbsG,   unit: 'g', color: '#b45309', bg: '#fef9c3' },
                    { label: 'Grasas',   value: macros.fatG,     unit: 'g', color: '#166534', bg: '#dcfce7' },
                  ].map(m => (
                    <View key={m.label} style={{ flex: 1, backgroundColor: m.bg, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: m.color, letterSpacing: -0.5 }}>
                        {m.value}
                      </Text>
                      <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: m.color, opacity: 0.8, marginTop: 1 }}>
                        {m.unit} {m.label}
                      </Text>
                    </View>
                  ))}
                </View>
                {data.gymKcalBurned != null && data.gymKcalBurned > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#fff7ed', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 13 }}>🔥</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#ea580c' }}>
                      Quemaste {data.gymKcalBurned} kcal en entreno hoy
                    </Text>
                  </View>
                )}
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 10 }}>
                  TDEE base {macros.tdee} kcal · ajustado por {day.label.toLowerCase()}
                </Text>
              </View>

              {/* ── 3. Mis comidas ── */}
              {data.mealPlan ? (
                <>
                  <MealList mealPlan={data.mealPlan} dayType={dayType} />
                  {/* ── 3. Hidratación ── */}
                  <HydrationSection
                    waterMlTarget={data.waterMlTarget}
                    fallbackL={data.mealPlan[dayType]?.hydrationL}
                  />
                  {/* ── 4. Suplementación ── */}
                  {data.mealPlan[dayType]?.supplements?.length > 0 && (
                    <SupplementsSection supplements={data.mealPlan[dayType].supplements} />
                  )}
                  {/* ── 5. Reglas ── */}
                  {data.mealPlan[dayType]?.rules?.length > 0 && (
                    <RulesSection rules={data.mealPlan[dayType].rules} />
                  )}
                </>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowSetup(true)}
                  style={{
                    backgroundColor: 'white', borderRadius: 20, borderWidth: 1,
                    borderColor: '#e5e7eb', padding: 20,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                      Armar mi plan de comidas
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
                      Medaliq arma tu menú con tus alimentos disponibles
                    </Text>
                  </View>
                  <Text style={{ fontSize: 22, color: '#1e3a5f' }}>+</Text>
                </TouchableOpacity>
              )}

              {/* ── Proponer alimento ── */}
              <TouchableOpacity
                onPress={() => setShowPropose(true)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: 'white', borderRadius: 20, borderWidth: 1,
                  borderColor: '#e5e7eb', padding: 16,
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>🥦</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>Proponer alimento</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 1 }}>
                    ¿No encuentras lo que buscas? Agrégalo a la biblioteca.
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: '#9ca3af' }}>›</Text>
              </TouchableOpacity>

              {/* ── Plantillas de comida ── */}
              <TouchableOpacity
                onPress={() => router.push('/(app)/nutrition-builder' as any)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: 'white', borderRadius: 20, borderWidth: 1,
                  borderColor: '#e5e7eb', padding: 16,
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>📋</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>Mis plantillas de comida</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 1 }}>
                    Crea y gestiona tus comidas habituales.
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: '#9ca3af' }}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      <FoodSetupFlow visible={showSetup} onClose={() => setShowSetup(false)} />
      <LogFoodModal visible={showLogFood} onClose={() => setShowLogFood(false)} date={getLocalDateString()} />
      <ProposeFoodModal visible={showPropose} onClose={() => setShowPropose(false)} onSuccess={refetchProposals} />
    </View>
  )
}
