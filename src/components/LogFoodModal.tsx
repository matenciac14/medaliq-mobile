import { useState, useMemo } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFoods, logFood, FoodItem } from '../api/nutrition'

const MEAL_TYPES = [
  { key: 'BREAKFAST',    label: 'Desayuno',     emoji: '🌅' },
  { key: 'LUNCH',        label: 'Almuerzo',     emoji: '☀️' },
  { key: 'DINNER',       label: 'Cena',         emoji: '🌙' },
  { key: 'SNACK',        label: 'Snack',        emoji: '🍎' },
  { key: 'PRE_WORKOUT',  label: 'Pre-entreno',  emoji: '⚡' },
  { key: 'POST_WORKOUT', label: 'Post-entreno', emoji: '🔄' },
]

const CATEGORY_LABELS: Record<string, string> = {
  PROTEIN: '🥩 Proteínas',
  CARB: '🍚 Carbohidratos',
  FAT: '🥑 Grasas',
  VEGETABLE: '🥦 Verduras',
  FRUIT: '🍌 Frutas',
  DAIRY: '🥛 Lácteos',
  LEGUME: '🫘 Legumbres',
}

type Step = 'search' | 'detail'

type Props = {
  visible: boolean
  onClose: () => void
  date?: string
}

export default function LogFoodModal({ visible, onClose, date }: Props) {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [grams, setGrams] = useState('')
  const [mealType, setMealType] = useState('BREAKFAST')

  const { data: foods = [], isLoading: loadingFoods } = useQuery({
    queryKey: ['foods'],
    queryFn: getFoods,
    staleTime: 10 * 60 * 1000, // 10 min — la librería no cambia seguido
  })

  const filtered = useMemo(() => {
    if (!query.trim()) return foods.slice(0, 30) // mostrar primeros 30 si no hay búsqueda
    const q = query.toLowerCase()
    return foods.filter(f => f.name.toLowerCase().includes(q)).slice(0, 40)
  }, [foods, query])

  const { mutate: submitLog, isPending } = useMutation({
    mutationFn: logFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-log'] })
      handleClose()
    },
  })

  function handleSelectFood(food: FoodItem) {
    setSelectedFood(food)
    setGrams(String(Math.round(food.servingG)))
    setStep('detail')
  }

  function handleSubmit() {
    if (!selectedFood || !grams) return
    const g = Number(grams)
    if (isNaN(g) || g <= 0) return
    submitLog({ foodId: selectedFood.id, grams: g, mealType, date })
  }

  function handleClose() {
    setStep('search')
    setQuery('')
    setSelectedFood(null)
    setGrams('')
    setMealType('BREAKFAST')
    onClose()
  }

  // Macros calculados para la cantidad ingresada
  const preview = selectedFood && grams
    ? (() => {
        const r = Number(grams) / 100
        return {
          kcal:     Math.round(selectedFood.kcalPer100g    * r),
          proteinG: Math.round(selectedFood.proteinPer100g * r * 10) / 10,
          carbsG:   Math.round(selectedFood.carbsPer100g   * r * 10) / 10,
          fatG:     Math.round(selectedFood.fatPer100g     * r * 10) / 10,
        }
      })()
    : null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'white', paddingTop: insets.top + 8 }}>

          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingBottom: 16,
            borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {step === 'detail' && (
                <TouchableOpacity onPress={() => setStep('search')} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 18, color: '#6b7280' }}>←</Text>
                </TouchableOpacity>
              )}
              <Text style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                {step === 'search' ? 'Registrar comida' : selectedFood?.name ?? ''}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 22, color: '#9ca3af' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* STEP: search */}
          {step === 'search' && (
            <>
              <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: '#f3f4f6', borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 10,
                }}>
                  <Text style={{ fontSize: 16, color: '#9ca3af' }}>🔍</Text>
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Buscar alimento..."
                    placeholderTextColor="#9ca3af"
                    autoFocus
                    style={{ flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#111827' }}
                  />
                  {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')}>
                      <Text style={{ fontSize: 16, color: '#9ca3af' }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {loadingFoods ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color="#1e3a5f" />
                </View>
              ) : (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {filtered.length === 0 ? (
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'center', marginTop: 40 }}>
                      Sin resultados para "{query}"
                    </Text>
                  ) : (
                    filtered.map(food => {
                      const r = food.servingG / 100
                      const servingKcal = Math.round(food.kcalPer100g * r)
                      const servingP    = Math.round(food.proteinPer100g * r * 10) / 10
                      return (
                        <TouchableOpacity
                          key={food.id}
                          onPress={() => handleSelectFood(food)}
                          style={{
                            paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                              {food.name}
                            </Text>
                            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
                              {CATEGORY_LABELS[food.category] ?? food.category}
                              {food.servingLabel ? ` · ${food.servingLabel}` : ''}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#f97316' }}>
                              {servingKcal} kcal
                            </Text>
                            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                              P {servingP}g · por porción
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )
                    })
                  )}
                </ScrollView>
              )}
            </>
          )}

          {/* STEP: detail */}
          {step === 'detail' && selectedFood && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Gramos */}
              <View>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                  Cantidad (gramos)
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  {[50, 100, 150, 200].map(g => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setGrams(String(g))}
                      style={{
                        flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center',
                        backgroundColor: grams === String(g) ? '#1e3a5f' : 'white',
                        borderColor: grams === String(g) ? '#1e3a5f' : '#e5e7eb',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: grams === String(g) ? 'white' : '#374151' }}>
                        {g}g
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  value={grams}
                  onChangeText={setGrams}
                  keyboardType="numeric"
                  placeholder="Otro valor..."
                  placeholderTextColor="#9ca3af"
                  style={{
                    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
                    paddingHorizontal: 14, paddingVertical: 12,
                    fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#111827',
                  }}
                />
                {selectedFood.servingLabel && (
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 6 }}>
                    Porción típica: {selectedFood.servingLabel} ({Math.round(selectedFood.servingG)}g)
                  </Text>
                )}
              </View>

              {/* Preview macros */}
              {preview && (
                <View style={{ backgroundColor: '#1e3a5f', borderRadius: 16, padding: 16 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                    Aporte de {grams}g
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { label: 'Calorías', value: preview.kcal,     unit: 'kcal', color: '#f97316' },
                      { label: 'Proteína', value: preview.proteinG, unit: 'g',    color: '#93c5fd' },
                      { label: 'Carbos',   value: preview.carbsG,   unit: 'g',    color: '#fde047' },
                      { label: 'Grasas',   value: preview.fatG,     unit: 'g',    color: '#86efac' },
                    ].map(m => (
                      <View key={m.label} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: m.color, letterSpacing: -0.5 }}>
                          {m.value}
                        </Text>
                        <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
                          {m.unit}
                        </Text>
                        <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
                          {m.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Tipo de comida */}
              <View>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                  Momento del día
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {MEAL_TYPES.map(mt => (
                    <TouchableOpacity
                      key={mt.key}
                      onPress={() => setMealType(mt.key)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1,
                        backgroundColor: mealType === mt.key ? '#1e3a5f' : 'white',
                        borderColor: mealType === mt.key ? '#1e3a5f' : '#e5e7eb',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: mealType === mt.key ? 'white' : '#374151' }}>
                        {mt.emoji} {mt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          )}

          {/* Footer — solo en detail */}
          {step === 'detail' && (
            <View style={{
              paddingHorizontal: 20, paddingTop: 12,
              paddingBottom: insets.bottom + 12,
              borderTopWidth: 1, borderTopColor: '#f3f4f6',
              backgroundColor: 'white',
            }}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isPending || !grams || Number(grams) <= 0}
                style={{
                  backgroundColor: isPending || !grams || Number(grams) <= 0 ? '#e5e7eb' : '#1e3a5f',
                  borderRadius: 14, paddingVertical: 16, alignItems: 'center',
                }}
              >
                {isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: !grams || Number(grams) <= 0 ? '#9ca3af' : 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>
                    Registrar comida
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
