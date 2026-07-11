import { useState, useMemo } from 'react'
import BarcodeScannerModal from './BarcodeScannerModal'
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
import {
  getFoods, logFood, FoodItem,
  getMealTemplates, createMealTemplate, deleteMealTemplate, MealTemplate,
  proposeFood, type ProposeInput,
} from '../api/nutrition'

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

type Step = 'search' | 'detail' | 'save-template' | 'propose'

const DEFAULT_PROPOSE = { name: '', category: 'CARB', kcalPer100g: '', proteinPer100g: '', carbsPer100g: '', fatPer100g: '', country: '', notes: '' }

function calcTemplateKcal(t: MealTemplate) {
  return t.items.reduce((sum, i) => sum + Math.round(i.food.kcalPer100g * i.grams / 100), 0)
}

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
  const [templateName, setTemplateName] = useState('')
  const [loggingTemplateId, setLoggingTemplateId] = useState<string | null>(null)
  const [proposeForm, setProposeForm] = useState<typeof DEFAULT_PROPOSE>(DEFAULT_PROPOSE)
  const [proposeSuccess, setProposeSuccess] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  const { data: foods = [], isLoading: loadingFoods } = useQuery({
    queryKey: ['foods'],
    queryFn: getFoods,
    staleTime: 10 * 60 * 1000,
  })

  const { data: templatesData, refetch: refetchTemplates } = useQuery({
    queryKey: ['meal-templates'],
    queryFn: getMealTemplates,
    staleTime: 2 * 60 * 1000,
  })
  const templates = templatesData?.templates ?? []

  const { mutate: saveTemplate, isPending: savingTemplate } = useMutation({
    mutationFn: createMealTemplate,
    onSuccess: () => {
      refetchTemplates()
      setStep('detail')
      setTemplateName('')
    },
  })

  const filtered = useMemo(() => {
    let result = foods
    if (filterCategory) result = result.filter(f => f.category === filterCategory)
    if (!query.trim()) return result.slice(0, 30)
    const q = query.toLowerCase()
    return result.filter(f => f.name.toLowerCase().includes(q)).slice(0, 40)
  }, [foods, query, filterCategory])

  const { mutate: submitLog, isPending } = useMutation({
    mutationFn: logFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-log'] })
      handleClose()
    },
  })

  const { mutate: submitPropose, isPending: proposing } = useMutation({
    mutationFn: proposeFood,
    onSuccess: () => { setProposeSuccess(true) },
  })

  function handleSubmitPropose() {
    const { name, category, kcalPer100g, proteinPer100g, carbsPer100g, fatPer100g, country, notes } = proposeForm
    if (!name.trim() || !kcalPer100g || !proteinPer100g || !carbsPer100g || !fatPer100g) return
    submitPropose({
      name: name.trim(), category,
      kcalPer100g: Number(kcalPer100g), proteinPer100g: Number(proteinPer100g),
      carbsPer100g: Number(carbsPer100g), fatPer100g: Number(fatPer100g),
      country: country || undefined, notes: notes.trim() || undefined,
    } as ProposeInput)
  }

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

  async function handleLogTemplate(t: MealTemplate) {
    setLoggingTemplateId(t.id)
    try {
      await Promise.all(
        t.items.map(item =>
          logFood({ foodId: item.foodId, grams: item.grams, mealType, date })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['nutrition-log'] })
      handleClose()
    } finally {
      setLoggingTemplateId(null)
    }
  }

  function handleSaveTemplate() {
    if (!selectedFood || !grams || !templateName.trim()) return
    saveTemplate({
      name: templateName.trim(),
      mealType,
      items: [{ foodId: selectedFood.id, grams: Number(grams) }],
    })
  }

  async function handleDeleteTemplate(id: string) {
    await deleteMealTemplate(id)
    refetchTemplates()
  }

  function handleClose() {
    setStep('search')
    setQuery('')
    setSelectedFood(null)
    setGrams('')
    setMealType('BREAKFAST')
    setTemplateName('')
    setProposeForm(DEFAULT_PROPOSE)
    setProposeSuccess(false)
    setShowScanner(false)
    setFilterCategory(null)
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
              {(step === 'detail' || step === 'save-template' || step === 'propose') && (
                <TouchableOpacity
                  onPress={() => step === 'save-template' ? setStep('detail') : setStep('search')}
                  style={{ padding: 4 }}
                >
                  <Text style={{ fontSize: 18, color: '#6b7280' }}>←</Text>
                </TouchableOpacity>
              )}
              <Text style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                {step === 'search' ? 'Registrar comida' : step === 'save-template' ? 'Guardar plantilla' : step === 'propose' ? 'Proponer alimento' : selectedFood?.name ?? ''}
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
                <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
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
                <TouchableOpacity
                  onPress={() => setShowScanner(true)}
                  style={{
                    backgroundColor: '#f3f4f6', borderRadius: 12,
                    paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>📷</Text>
                </TouchableOpacity>
              </View>
              </View>

              {/* Filtros de categoría */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ maxHeight: 44 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 8 }}
              >
                {[{ key: null, label: 'Todos' }, ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ key: k, label: v }))].map(c => (
                  <TouchableOpacity
                    key={c.key ?? 'all'}
                    onPress={() => setFilterCategory(c.key)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                      backgroundColor: filterCategory === c.key ? '#1e3a5f' : 'white',
                      borderColor: filterCategory === c.key ? '#1e3a5f' : '#e5e7eb',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: filterCategory === c.key ? 'white' : '#374151' }}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

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
                  {/* Mis comidas (plantillas) — solo cuando no hay búsqueda */}
                  {!query.trim() && templates.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                        Mis comidas
                      </Text>
                      {templates.map(t => {
                        const kcal = calcTemplateKcal(t)
                        return (
                          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <TouchableOpacity
                              onPress={() => handleLogTemplate(t)}
                              disabled={loggingTemplateId === t.id}
                              style={{
                                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                paddingHorizontal: 14, paddingVertical: 12,
                                borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
                                opacity: loggingTemplateId === t.id ? 0.6 : 1,
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                                  {t.name}
                                </Text>
                                <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
                                  {t.items.length} {t.items.length === 1 ? 'alimento' : 'alimentos'}
                                  {t.mealType ? ` · ${MEAL_TYPES.find(m => m.key === t.mealType)?.label ?? t.mealType}` : ''}
                                </Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                {loggingTemplateId === t.id ? (
                                  <ActivityIndicator size="small" color="#1e3a5f" />
                                ) : (
                                  <>
                                    <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#f97316' }}>{kcal} kcal</Text>
                                    <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>Registrar todo</Text>
                                  </>
                                )}
                              </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteTemplate(t.id)}
                              style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Text style={{ fontSize: 16, color: '#d1d5db' }}>🗑</Text>
                            </TouchableOpacity>
                          </View>
                        )
                      })}
                      <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 4, marginBottom: 12 }} />
                    </View>
                  )}

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
                  {query.trim().length >= 2 && (
                    <TouchableOpacity
                      onPress={() => { setProposeForm(p => ({ ...p, name: query.trim() })); setStep('propose') }}
                      style={{ marginTop: 20, paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6' }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>
                        {'¿No lo encontraste?  '}
                        <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>Proponer alimento →</Text>
                      </Text>
                    </TouchableOpacity>
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

          {/* Footer — detail */}
          {step === 'detail' && (
            <View style={{
              paddingHorizontal: 20, paddingTop: 12,
              paddingBottom: insets.bottom + 12,
              borderTopWidth: 1, borderTopColor: '#f3f4f6',
              backgroundColor: 'white',
              gap: 8,
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
              <TouchableOpacity
                onPress={() => setStep('save-template')}
                disabled={!grams || Number(grams) <= 0}
                style={{ paddingVertical: 10, alignItems: 'center', opacity: !grams || Number(grams) <= 0 ? 0.4 : 1 }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>
                  + Guardar como plantilla
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP: save-template */}
          {step === 'save-template' && selectedFood && (
            <>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 20 }}
                keyboardShouldPersistTaps="handled"
              >
                <View>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                    Alimento
                  </Text>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                    {selectedFood.name}
                  </Text>
                  {preview && (
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
                      {grams}g · {preview.kcal} kcal · P {preview.proteinG}g
                    </Text>
                  )}
                </View>

                <View>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                    Nombre de la plantilla
                  </Text>
                  <TextInput
                    value={templateName}
                    onChangeText={setTemplateName}
                    placeholder="Ej: Desayuno proteico, Snack post-entreno..."
                    placeholderTextColor="#9ca3af"
                    maxLength={100}
                    autoFocus
                    style={{
                      borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
                      paddingHorizontal: 14, paddingVertical: 12,
                      fontSize: 14, fontFamily: 'Inter_400Regular', color: '#111827',
                    }}
                  />
                </View>

                <View>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                    Momento del día (opcional)
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

              <View style={{
                paddingHorizontal: 20, paddingTop: 12,
                paddingBottom: insets.bottom + 12,
                borderTopWidth: 1, borderTopColor: '#f3f4f6',
                backgroundColor: 'white',
                gap: 8,
              }}>
                <TouchableOpacity
                  onPress={handleSaveTemplate}
                  disabled={savingTemplate || !templateName.trim()}
                  style={{
                    backgroundColor: savingTemplate || !templateName.trim() ? '#e5e7eb' : '#1e3a5f',
                    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
                  }}
                >
                  {savingTemplate ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: !templateName.trim() ? '#9ca3af' : 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>
                      Guardar plantilla
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStep('detail')}
                  style={{ paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          {/* STEP: propose */}
          {step === 'propose' && (
            proposeSuccess ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
                <Text style={{ fontSize: 40 }}>✓</Text>
                <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#111827', textAlign: 'center' }}>
                  ¡Propuesta enviada!
                </Text>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
                  El alimento está disponible en la librería mientras el equipo lo revisa.
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={{ marginTop: 8, backgroundColor: '#1e3a5f', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 }}
                >
                  <Text style={{ color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>Listo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 20 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Nombre */}
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Nombre *</Text>
                    <TextInput
                      value={proposeForm.name}
                      onChangeText={v => setProposeForm(p => ({ ...p, name: v }))}
                      placeholder="Ej: Pandebono, Taco de bistec..."
                      placeholderTextColor="#9ca3af"
                      autoFocus
                      style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#111827' }}
                    />
                  </View>

                  {/* Categoría */}
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Categoría *</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {[
                        { key: 'PROTEIN', label: 'Proteína' }, { key: 'CARB', label: 'Carbs' },
                        { key: 'FAT', label: 'Grasa' }, { key: 'VEGETABLE', label: 'Verdura' },
                        { key: 'FRUIT', label: 'Fruta' }, { key: 'DAIRY', label: 'Lácteo' },
                        { key: 'LEGUME', label: 'Legumbre' }, { key: 'PREPARED', label: 'Plato' },
                        { key: 'OTHER', label: 'Otro' },
                      ].map(c => (
                        <TouchableOpacity
                          key={c.key}
                          onPress={() => setProposeForm(p => ({ ...p, category: c.key }))}
                          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: proposeForm.category === c.key ? '#1e3a5f' : 'white', borderColor: proposeForm.category === c.key ? '#1e3a5f' : '#e5e7eb' }}
                        >
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: proposeForm.category === c.key ? 'white' : '#374151' }}>{c.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Macros */}
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Macros por 100g *</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {([
                        { key: 'kcalPer100g', label: 'kcal' },
                        { key: 'proteinPer100g', label: 'Prot.' },
                        { key: 'carbsPer100g', label: 'Carbs' },
                        { key: 'fatPer100g', label: 'Grasa' },
                      ] as const).map(field => (
                        <View key={field.key} style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginBottom: 4, textAlign: 'center' }}>{field.label}</Text>
                          <TextInput
                            value={proposeForm[field.key]}
                            onChangeText={v => setProposeForm(p => ({ ...p, [field.key]: v }))}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#9ca3af"
                            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827', textAlign: 'center' }}
                          />
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* País */}
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>País de origen</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {[
                        { key: '', label: 'Universal' }, { key: 'CO', label: 'Colombia' },
                        { key: 'MX', label: 'México' }, { key: 'AR', label: 'Argentina' },
                        { key: 'PE', label: 'Perú' }, { key: 'VE', label: 'Venezuela' },
                        { key: 'CL', label: 'Chile' },
                      ].map(c => (
                        <TouchableOpacity
                          key={c.key || 'universal'}
                          onPress={() => setProposeForm(p => ({ ...p, country: c.key }))}
                          style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, backgroundColor: proposeForm.country === c.key ? '#f97316' : 'white', borderColor: proposeForm.country === c.key ? '#f97316' : '#e5e7eb' }}
                        >
                          <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: proposeForm.country === c.key ? 'white' : '#374151' }}>{c.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Notas */}
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Notas para el equipo (opcional)</Text>
                    <TextInput
                      value={proposeForm.notes}
                      onChangeText={v => setProposeForm(p => ({ ...p, notes: v }))}
                      placeholder="Ej: pandebono de panadería, aprox 60g c/u..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={3}
                      style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#111827', textAlignVertical: 'top', minHeight: 80 }}
                    />
                  </View>
                </ScrollView>

                <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: 'white' }}>
                  <TouchableOpacity
                    onPress={handleSubmitPropose}
                    disabled={proposing || !proposeForm.name.trim() || !proposeForm.kcalPer100g}
                    style={{ backgroundColor: proposing || !proposeForm.name.trim() || !proposeForm.kcalPer100g ? '#e5e7eb' : '#1e3a5f', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                  >
                    {proposing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={{ color: !proposeForm.name.trim() || !proposeForm.kcalPer100g ? '#9ca3af' : 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>
                        Enviar propuesta
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )
          )}
        </View>
      </KeyboardAvoidingView>

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onFoodFound={food => {
          setShowScanner(false)
          handleSelectFood(food)
        }}
        onNotFound={barcode => {
          setShowScanner(false)
          setProposeForm(p => ({ ...p, notes: `Código de barras: ${barcode}` }))
          setStep('propose')
        }}
      />
    </Modal>
  )
}
