import { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { getNutrition, getFoodLogs } from '../../../src/api/nutrition'
import { useAuthStore } from '../../../src/store/auth'
import UpgradeWall from '../../../src/components/UpgradeWall'
import FoodSetupFlow from '../../../src/components/FoodSetupFlow'
import LogFoodModal from '../../../src/components/LogFoodModal'

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

const HYDRATION_TIPS = [
  'Al despertar: 500 ml con una pizca de sal marina',
  'Durante el entreno: 150–200 ml cada 20 minutos',
  'Post-sesión: 500 ml para recuperación inmediata',
]

function HydrationSection({ hydrationL }: { hydrationL: number }) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>💧</Text>
        </View>
        <View>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>
            Hidratación
          </Text>
          <Text style={{ fontSize: 24, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -0.5, marginTop: 2 }}>
            {hydrationL} L
          </Text>
        </View>
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 20, paddingVertical: 14, gap: 10 }}>
        {HYDRATION_TIPS.map((tip, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#1d4ed8' }}>{i + 1}</Text>
            </View>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#374151', flex: 1, lineHeight: 19 }}>{tip}</Text>
          </View>
        ))}
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

// ─── TrackingSection ─────────────────────────────────────────────────────────

function TrackingSection({ onAdd }: { onAdd: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['nutrition-log'],
    queryFn: () => getFoodLogs(),
    staleTime: 30_000,
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
                <View key={log.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#374151', flex: 1 }} numberOfLines={1}>
                    {log.food.name}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginLeft: 8 }}>
                    {log.grams}g · {log.kcal} kcal
                  </Text>
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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const { user } = useAuthStore()
  const insets = useSafeAreaInsets()
  const { data, isLoading } = useQuery({ queryKey: ['nutrition'], queryFn: getNutrition })
  const [showSetup, setShowSetup]   = useState(false)
  const [showLogFood, setShowLogFood] = useState(false)

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

          {data?.hasNutritionPlan && macros && (
            <>
              {/* ── 1. Hero: objetivo del día ── */}
              <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', padding: 20 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                  Tu objetivo de hoy
                </Text>
                {/* Kcal grande */}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                  <Text style={{ fontSize: 42, fontFamily: 'Inter_900Black', color: '#f97316', letterSpacing: -1.5 }}>
                    {macros.kcal.toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_400Regular', color: '#9ca3af', paddingBottom: 4 }}>
                    kcal
                  </Text>
                </View>
                {/* Macro pills en fila */}
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
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 10 }}>
                  TDEE base {macros.tdee} kcal · ajustado por {day.label.toLowerCase()}
                </Text>
              </View>

              {/* ── 2. Mis comidas ── */}
              {data.mealPlan ? (
                <>
                  <MealList mealPlan={data.mealPlan} dayType={dayType} />
                  {/* ── 3. Hidratación ── */}
                  {data.mealPlan[dayType]?.hydrationL != null && (
                    <HydrationSection hydrationL={data.mealPlan[dayType].hydrationL} />
                  )}
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

              {/* ── 6. Lo que comí ── */}
              <TrackingSection onAdd={() => setShowLogFood(true)} />
            </>
          )}
        </ScrollView>
      )}

      <FoodSetupFlow visible={showSetup} onClose={() => setShowSetup(false)} />
      <LogFoodModal visible={showLogFood} onClose={() => setShowLogFood(false)} />
    </View>
  )
}
