import { useState } from 'react'
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
import { useQueryClient } from '@tanstack/react-query'
import { generateMeals } from '../api/nutrition'

const FOOD_CATEGORIES = [
  {
    label: 'Proteínas',
    icon: '🥩',
    foods: [
      'Huevos', 'Pechuga de pollo', 'Muslo de pollo',
      'Carne de res (molida)', 'Chata / Punta de anca', 'Lomo de cerdo / Cañón',
      'Costillas de cerdo', 'Pierna de cerdo', 'Salmón', 'Tilapia',
      'Róbalo / Corvina', 'Atún en lata', 'Queso campesino',
    ],
  },
  {
    label: 'Carbohidratos',
    icon: '🍚',
    foods: [
      'Arroz blanco', 'Papa', 'Yuca', 'Plátano maduro', 'Plátano verde',
      'Pan blanco', 'Arepa', 'Avena', 'Frijoles', 'Lentejas',
    ],
  },
  {
    label: 'Grasas saludables',
    icon: '🥑',
    foods: ['Aguacate', 'Aceite de oliva', 'Crema de maní', 'Mantequilla', 'Almendras / Nueces'],
  },
  {
    label: 'Verduras y frutas',
    icon: '🥦',
    foods: [
      'Brócoli', 'Espárragos', 'Espinaca', 'Lechuga / Ensalada',
      'Tomate', 'Pepino', 'Zanahoria', 'Banano', 'Mango', 'Papaya', 'Fresas / Arándanos',
    ],
  },
]

const RESTRICTION_OPTIONS = [
  'Sin lácteos', 'Sin gluten', 'Sin cerdo', 'Sin mariscos',
  'Vegetariano', 'Sin huevo', 'Sin nueces',
]

type Step = 'foods' | 'prefs' | 'generating' | 'done'

type Props = {
  visible: boolean
  onClose: () => void
}

export default function FoodSetupFlow({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('foods')
  const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set())
  const [customFood, setCustomFood] = useState('')
  const [restrictions, setRestrictions] = useState<Set<string>>(new Set())
  const [mealsPerDay, setMealsPerDay] = useState(3)
  const [weighsFood, setWeighsFood] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function toggleFood(food: string) {
    setSelectedFoods(prev => {
      const next = new Set(prev)
      next.has(food) ? next.delete(food) : next.add(food)
      return next
    })
  }

  function addCustomFood() {
    const trimmed = customFood.trim()
    if (!trimmed) return
    setSelectedFoods(prev => new Set([...prev, trimmed]))
    setCustomFood('')
  }

  function toggleRestriction(r: string) {
    setRestrictions(prev => {
      const next = new Set(prev)
      next.has(r) ? next.delete(r) : next.add(r)
      return next
    })
  }

  function handleClose() {
    setStep('foods')
    setSelectedFoods(new Set())
    setCustomFood('')
    setRestrictions(new Set())
    setMealsPerDay(3)
    setWeighsFood(false)
    setNotes('')
    setError(null)
    onClose()
  }

  async function handleGenerate() {
    setStep('generating')
    setError(null)
    try {
      await generateMeals({
        availableFoods: Array.from(selectedFoods),
        restrictions: Array.from(restrictions),
        mealsPerDay,
        weighsFood,
        notes: notes.trim() || undefined,
      })
      setStep('done')
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['nutrition'] })
        handleClose()
      }, 1500)
    } catch (err: any) {
      setError(err?.message ?? 'Error al generar el plan')
      setStep('prefs')
    }
  }

  const allPredefinedFoods = FOOD_CATEGORIES.flatMap(c => c.foods)
  const customFoods = Array.from(selectedFoods).filter(f => !allPredefinedFoods.includes(f))

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
            <View>
              {(step === 'foods' || step === 'prefs') && (
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' }}>
                  {step === 'foods' ? 'Paso 1 de 2' : 'Paso 2 de 2'}
                </Text>
              )}
              <Text style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: '#111827', marginTop: 2 }}>
                {step === 'foods' && '¿Qué alimentos tienes?'}
                {step === 'prefs' && 'Tus preferencias'}
                {step === 'generating' && 'Generando tu plan...'}
                {step === 'done' && '¡Plan listo!'}
              </Text>
            </View>
            {(step === 'foods' || step === 'prefs') && (
              <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
                <Text style={{ fontSize: 22, color: '#9ca3af' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >

            {/* STEP 1: Selección de alimentos */}
            {step === 'foods' && (
              <View style={{ gap: 20 }}>
                {FOOD_CATEGORIES.map(cat => (
                  <View key={cat.label}>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                      {cat.icon} {cat.label}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {cat.foods.map(food => {
                        const selected = selectedFoods.has(food)
                        return (
                          <TouchableOpacity
                            key={food}
                            onPress={() => toggleFood(food)}
                            style={{
                              paddingHorizontal: 12, paddingVertical: 7,
                              borderRadius: 20, borderWidth: 1,
                              backgroundColor: selected ? '#1e3a5f' : 'white',
                              borderColor: selected ? '#1e3a5f' : '#e5e7eb',
                            }}
                          >
                            <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: selected ? 'white' : '#374151' }}>
                              {food}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                ))}

                {/* Alimento personalizado */}
                <View>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                    + Agregar otro alimento
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={customFood}
                      onChangeText={setCustomFood}
                      onSubmitEditing={addCustomFood}
                      placeholder="ej. Chontaduro, Sardinas..."
                      placeholderTextColor="#9ca3af"
                      returnKeyType="done"
                      style={{
                        flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
                        paddingHorizontal: 14, paddingVertical: 10,
                        fontSize: 14, fontFamily: 'Inter_400Regular', color: '#111827',
                      }}
                    />
                    <TouchableOpacity
                      onPress={addCustomFood}
                      style={{ backgroundColor: '#1e3a5f', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' }}
                    >
                      <Text style={{ color: 'white', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>+ Agregar</Text>
                    </TouchableOpacity>
                  </View>
                  {customFoods.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {customFoods.map(f => (
                        <View key={f} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1e3a5f' }}>
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: 'white' }}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* STEP 2: Preferencias */}
            {step === 'prefs' && (
              <View style={{ gap: 24 }}>

                {/* Comidas por día */}
                <View>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                    ¿Cuántas comidas al día?
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[3, 4, 5].map(n => (
                      <TouchableOpacity
                        key={n}
                        onPress={() => setMealsPerDay(n)}
                        style={{
                          flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
                          alignItems: 'center',
                          backgroundColor: mealsPerDay === n ? '#1e3a5f' : 'white',
                          borderColor: mealsPerDay === n ? '#1e3a5f' : '#e5e7eb',
                        }}
                      >
                        <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: mealsPerDay === n ? 'white' : '#374151' }}>
                          {n}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: mealsPerDay === n ? 'rgba(255,255,255,0.7)' : '#9ca3af', marginTop: 2 }}>
                          comidas
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Báscula */}
                <View>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                    ¿Tienes báscula de cocina?
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { value: true, label: 'Sí, peso todo', desc: 'Gramos exactos' },
                      { value: false, label: 'No, a ojo', desc: 'Medidas caseras' },
                    ].map(opt => (
                      <TouchableOpacity
                        key={String(opt.value)}
                        onPress={() => setWeighsFood(opt.value)}
                        style={{
                          flex: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1,
                          backgroundColor: weighsFood === opt.value ? '#1e3a5f' : 'white',
                          borderColor: weighsFood === opt.value ? '#1e3a5f' : '#e5e7eb',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: weighsFood === opt.value ? 'white' : '#374151' }}>
                          {opt.label}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: weighsFood === opt.value ? 'rgba(255,255,255,0.7)' : '#9ca3af', marginTop: 2 }}>
                          {opt.desc}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Restricciones */}
                <View>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                    Restricciones alimentarias
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {RESTRICTION_OPTIONS.map(r => {
                      const active = restrictions.has(r)
                      return (
                        <TouchableOpacity
                          key={r}
                          onPress={() => toggleRestriction(r)}
                          style={{
                            paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
                            backgroundColor: active ? '#fee2e2' : 'white',
                            borderColor: active ? '#fca5a5' : '#e5e7eb',
                          }}
                        >
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: active ? '#b91c1c' : '#374151' }}>
                            {r}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>

                {/* Notas */}
                <View>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                    Algo más que el coach deba saber (opcional)
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="ej. Solo puedo cocinar en microondas..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    style={{
                      borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
                      paddingHorizontal: 14, paddingVertical: 12,
                      fontSize: 14, fontFamily: 'Inter_400Regular', color: '#111827',
                      textAlignVertical: 'top', minHeight: 80,
                    }}
                  />
                </View>

                {error && (
                  <View style={{ backgroundColor: '#fee2e2', borderRadius: 12, padding: 12 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#b91c1c' }}>{error}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Generating */}
            {step === 'generating' && (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 }}>
                <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color="#1e3a5f" size="large" />
                </View>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827', textAlign: 'center' }}>
                  Analizando tu perfil...
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', maxWidth: 240 }}>
                  Medaliq está armando tu menú personalizado con tus alimentos disponibles
                </Text>
              </View>
            )}

            {/* Done */}
            {step === 'done' && (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 }}>
                <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 32 }}>✅</Text>
                </View>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827', textAlign: 'center' }}>
                  ¡Plan nutricional listo!
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>
                  Cargando tu menú personalizado...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {(step === 'foods' || step === 'prefs') && (
            <View style={{
              paddingHorizontal: 20, paddingTop: 12,
              paddingBottom: insets.bottom + 12,
              borderTopWidth: 1, borderTopColor: '#f3f4f6',
              backgroundColor: 'white',
            }}>
              {step === 'foods' && (
                <TouchableOpacity
                  onPress={() => setStep('prefs')}
                  disabled={selectedFoods.size < 2}
                  style={{
                    backgroundColor: selectedFoods.size < 2 ? '#e5e7eb' : '#1e3a5f',
                    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
                  }}
                >
                  <Text style={{ color: selectedFoods.size < 2 ? '#9ca3af' : 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>
                    Continuar ({selectedFoods.size} alimentos) →
                  </Text>
                </TouchableOpacity>
              )}
              {step === 'prefs' && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setStep('foods')}
                    style={{ paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb' }}
                  >
                    <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>← Atrás</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleGenerate}
                    style={{ flex: 1, backgroundColor: '#1e3a5f', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                  >
                    <Text style={{ color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>
                      Generar mi plan
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
