import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { getMealTemplates, createMealTemplate, deleteMealTemplate, getFoods } from '../../src/api/nutrition'
import type { MealTemplate, FoodItem as Food } from '../../src/api/nutrition'

// ─── Template Card ────────────────────────────────────────────────────────────

function calcMacros(template: MealTemplate) {
  return template.items.reduce((acc, item) => {
    const mult = item.grams / 100
    return {
      kcal: acc.kcal + (item.food.kcalPer100g ?? 0) * mult,
      protein: acc.protein + (item.food.proteinPer100g ?? 0) * mult,
    }
  }, { kcal: 0, protein: 0 })
}

function TemplateCard({ template, onDelete }: { template: MealTemplate; onDelete: (id: string) => void }) {
  const macros = calcMacros(template)
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{template.name}</Text>
          {template.mealType && (
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 1 }}>
              {template.mealType === 'BREAKFAST' ? 'Desayuno' : template.mealType === 'LUNCH' ? 'Almuerzo' : template.mealType === 'DINNER' ? 'Cena' : 'Snack'}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => onDelete(template.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={18} color="#e5e7eb" />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>{Math.round(macros.kcal)}</Text>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>kcal</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#f97316' }}>{Math.round(macros.protein)}g</Text>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>proteína</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>{template.items.length}</Text>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>alimentos</Text>
        </View>
      </View>
      <View style={{ gap: 4 }}>
        {template.items.slice(0, 3).map((item, i) => (
          <Text key={i} style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>
            · {item.food.name} — {item.grams}g
          </Text>
        ))}
        {template.items.length > 3 && (
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>+{template.items.length - 3} más</Text>
        )}
      </View>
    </View>
  )
}

// ─── Create Form ──────────────────────────────────────────────────────────────

type TemplateItem = { food: Food; grams: number }

const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Desayuno' },
  { value: 'LUNCH', label: 'Almuerzo' },
  { value: 'DINNER', label: 'Cena' },
  { value: 'SNACK', label: 'Snack' },
]

function CreateForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState<string | null>(null)
  const [items, setItems] = useState<TemplateItem[]>([])
  const [query, setQuery] = useState('')
  const [grams, setGrams] = useState<Record<string, string>>({})

  const { data: foodResults, isLoading: searchLoading } = useQuery({
    queryKey: ['foods-search', query],
    queryFn: () => query.length >= 2 ? getFoods() : Promise.resolve<Food[]>([]),
    enabled: query.length >= 2,
  })

  const filteredFoods = query.length >= 2
    ? (foodResults ?? []).filter((f: Food) => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  const qc = useQueryClient()
  const { mutate: save, isPending } = useMutation({
    mutationFn: () => createMealTemplate({
      name: name.trim(),
      mealType: mealType ?? undefined,
      items: items.map(i => ({ foodId: i.food.id, grams: i.grams })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meal-templates'] }); onSaved() },
    onError: () => Alert.alert('Error', 'No se pudo guardar la plantilla.'),
  })

  function addFood(food: Food) {
    if (items.find(i => i.food.id === food.id)) return
    const g = parseInt(grams[food.id] ?? String(food.servingG ?? 100), 10)
    setItems(prev => [...prev, { food, grams: isNaN(g) ? 100 : g }])
    setQuery('')
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const totalKcal = items.reduce((acc, i) => acc + (i.food.kcalPer100g ?? 0) * i.grams / 100, 0)

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ gap: 16, padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Nombre */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Nombre de la plantilla</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Desayuno proteico"
            placeholderTextColor="#94a3b8"
            style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#0f172a' }}
          />
        </View>

        {/* Tipo de comida */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Tipo (opcional)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MEAL_TYPES.map(mt => (
              <TouchableOpacity
                key={mt.value}
                onPress={() => setMealType(prev => prev === mt.value ? null : mt.value)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: mealType === mt.value ? '#1e3a5f' : '#e2e8f0', backgroundColor: mealType === mt.value ? '#1e3a5f' : 'white' }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: mealType === mt.value ? 'white' : '#374151' }}>{mt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Buscar alimentos */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Agregar alimentos</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar alimento..."
            placeholderTextColor="#94a3b8"
            style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#0f172a' }}
          />
          {searchLoading && <ActivityIndicator color="#f97316" style={{ alignSelf: 'flex-start' }} />}
          {filteredFoods.map(food => (
            <TouchableOpacity
              key={food.id}
              onPress={() => addFood(food)}
              style={{ backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{food.name}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{Math.round(food.kcalPer100g ?? 0)} kcal/100g · {food.servingG ?? 100}g porción</Text>
              </View>
              <Ionicons name="add-circle-outline" size={20} color="#1e3a5f" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Items agregados */}
        {items.length > 0 && (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Alimentos ({items.length})</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>{Math.round(totalKcal)} kcal total</Text>
            </View>
            {items.map((item, idx) => (
              <View key={idx} style={{ backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{item.food.name}</Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{item.grams}g · {Math.round((item.food.kcalPer100g ?? 0) * item.grams / 100)} kcal</Text>
                </View>
                <TouchableOpacity onPress={() => removeItem(idx)}>
                  <Ionicons name="close-circle" size={20} color="#e5e7eb" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Botones */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <TouchableOpacity onPress={onCancel} style={{ flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (!name.trim()) return Alert.alert('', 'Ponle un nombre a la plantilla.')
              if (items.length === 0) return Alert.alert('', 'Agrega al menos un alimento.')
              save()
            }}
            disabled={isPending}
            style={{ flex: 1, backgroundColor: '#1e3a5f', borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? <ActivityIndicator color="white" /> : <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: 'white' }}>Guardar</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NutritionBuilderScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['meal-templates'],
    queryFn: getMealTemplates,
  })

  const { mutate: doDelete } = useMutation({
    mutationFn: deleteMealTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-templates'] }),
    onError: () => Alert.alert('Error', 'No se pudo eliminar la plantilla.'),
  })

  const confirmDelete = useCallback((id: string) => {
    Alert.alert('Eliminar plantilla', '¿Seguro que quieres eliminarla?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(id) },
    ])
  }, [doDelete])

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1e3a5f', paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: 'white', flex: 1 }}>Mis plantillas de comida</Text>
          {!creating && (
            <TouchableOpacity onPress={() => setCreating(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="add-circle-outline" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {creating ? (
        <CreateForm onCancel={() => setCreating(false)} onSaved={() => setCreating(false)} />
      ) : isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      ) : !data?.templates?.length ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
          <Text style={{ fontSize: 40 }}>🍽️</Text>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#374151', textAlign: 'center' }}>Sin plantillas aún</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'center' }}>Crea plantillas de comidas reutilizables para planificar tu nutrición fácilmente.</Text>
          <TouchableOpacity
            onPress={() => setCreating(true)}
            style={{ backgroundColor: '#1e3a5f', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 }}
          >
            <Text style={{ color: 'white', fontFamily: 'Inter_700Bold', fontSize: 14 }}>Crear primera plantilla</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setCreating(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'white', borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#1e3a5f', padding: 14 }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#1e3a5f" />
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>Nueva plantilla</Text>
          </TouchableOpacity>
          {(data.templates as MealTemplate[]).map(t => (
            <TemplateCard key={t.id} template={t} onDelete={confirmDelete} />
          ))}
        </ScrollView>
      )}
    </View>
  )
}
