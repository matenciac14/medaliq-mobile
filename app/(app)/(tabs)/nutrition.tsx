import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { getNutrition } from '../../../src/api/nutrition'
import { useAuthStore } from '../../../src/store/auth'
import UpgradeWall from '../../../src/components/UpgradeWall'

const DAY_TYPE = {
  hard: { label: 'Día duro', emoji: '🔥', bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
  easy: { label: 'Día fácil', emoji: '✅', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  rest: { label: 'Descanso', emoji: '😴', bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
}

const MACRO_COLORS = {
  kcal: '#f97316',
  proteinG: '#3b82f6',
  carbsG: '#eab308',
  fatG: '#22c55e',
}

function MealPlanSection({ mealPlan, dayType }: { mealPlan: any; dayType: string }) {
  const meals = dayType === 'hard' ? mealPlan?.hard : dayType === 'rest' ? mealPlan?.rest : mealPlan?.easy
  if (!meals || !Array.isArray(meals)) return null

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', padding: 20 }}>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
        PLAN DE COMIDAS
      </Text>
      {meals.map((meal: any, i: number) => (
        <View key={i} style={{ marginBottom: i < meals.length - 1 ? 16 : 0 }}>
          {i > 0 && <View style={{ height: 1, backgroundColor: '#f3f4f6', marginBottom: 16 }} />}
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f', marginBottom: 4 }}>
            {meal.time ?? meal.name}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#111827', marginBottom: 4 }}>
            {Array.isArray(meal.foods) ? meal.foods.join(' + ') : meal.description}
          </Text>
          {meal.kcal && (
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
              ~{meal.kcal} kcal
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}

export default function NutritionScreen() {
  const { user } = useAuthStore()
  const insets = useSafeAreaInsets()
  const { data, isLoading } = useQuery({ queryKey: ['nutrition'], queryFn: getNutrition })

  if (!user?.features?.nutrition) {
    return <UpgradeWall icon="🥗" title="Plan nutricional" description="Accede a tu plan de nutrición periodizado por tipo de entrenamiento con el plan Pro." />
  }

  const dayStyle = DAY_TYPE[data?.dayType ?? 'easy']

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 22, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: 'white', fontSize: 28, fontFamily: 'Inter_900Black', letterSpacing: -0.5 }}>
              Nutrición
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
              Ajustado a tu sesión de hoy
            </Text>
          </View>
          {!isLoading && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
                {dayStyle.emoji} {dayStyle.label}
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
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {!data?.hasNutritionPlan ? (
            <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 16, padding: 20 }}>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#92400e' }}>Sin plan nutricional</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#b45309', marginTop: 4 }}>
                Completa el onboarding para activar tu plan nutricional base.
              </Text>
            </View>
          ) : (
            <>
              {/* Macros */}
              <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', padding: 20 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                  TUS MACROS DE HOY
                </Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginBottom: 16 }}>
                  TDEE base: {data.macros?.tdee} kcal · Ajustado por intensidad del día
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { label: 'Calorías', value: String(data.macros?.kcal), unit: 'kcal', key: 'kcal' },
                    { label: 'Proteína', value: String(data.macros?.proteinG), unit: 'g', key: 'proteinG' },
                    { label: 'Carbos', value: String(data.macros?.carbsG), unit: 'g', key: 'carbsG' },
                    { label: 'Grasas', value: String(data.macros?.fatG), unit: 'g', key: 'fatG' },
                  ].map(m => (
                    <View key={m.key} style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 14, padding: 12 }}>
                      <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#6b7280', marginBottom: 4 }}>{m.label}</Text>
                      <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black',
                        color: MACRO_COLORS[m.key as keyof typeof MACRO_COLORS], letterSpacing: -0.5 }}>
                        {m.value}
                      </Text>
                      <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>{m.unit}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Meal plan */}
              {data.mealPlan ? (
                <MealPlanSection mealPlan={data.mealPlan} dayType={data.dayType} />
              ) : (
                <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 16, padding: 16 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1e40af', marginBottom: 4 }}>
                    Plan de comidas detallado
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#3b82f6' }}>
                    Completa tu perfil alimenticio para recibir comidas específicas.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  )
}
