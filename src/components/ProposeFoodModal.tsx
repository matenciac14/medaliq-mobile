import { useState } from 'react'
import {
  Modal, View, Text, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { proposeFood, type ProposeInput } from '../api/nutrition'

const CATEGORIES = ['Carnes', 'Lácteos', 'Granos', 'Frutas', 'Verduras', 'Legumbres', 'Aceites', 'Bebidas', 'Snacks', 'Otro']

type Props = {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

function Field({
  label, value, onChange, placeholder, keyboardType = 'default', required = false, hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad'
  required?: boolean
  hint?: string
}) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>{label}</Text>
        {required && <Text style={{ fontSize: 12, color: '#ef4444' }}>*</Text>}
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#d1d5db"
        keyboardType={keyboardType}
        inputMode={keyboardType === 'decimal-pad' ? 'decimal' : keyboardType === 'number-pad' ? 'numeric' : 'text'}
        style={{
          backgroundColor: '#f9fafb', borderRadius: 10,
          paddingHorizontal: 14, paddingVertical: 12,
          fontSize: 15, fontFamily: 'Inter_400Regular', color: '#111827',
          borderWidth: 1, borderColor: '#e5e7eb',
        }}
      />
      {hint && <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{hint}</Text>}
    </View>
  )
}

export default function ProposeFoodModal({ visible, onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [fiber, setFiber] = useState('')
  const [servingG, setServingG] = useState('')
  const [servingLabel, setServingLabel] = useState('')
  const [country, setCountry] = useState('Colombia')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  function reset() {
    setName(''); setCategory(''); setKcal(''); setProtein('')
    setCarbs(''); setFat(''); setFiber(''); setServingG('')
    setServingLabel(''); setCountry('Colombia'); setNotes('')
  }

  async function handleSubmit() {
    if (!name.trim()) { Alert.alert('Falta el nombre', 'El nombre del alimento es obligatorio.'); return }
    if (!category) { Alert.alert('Falta la categoría', 'Selecciona una categoría.'); return }
    if (!kcal || !protein || !carbs || !fat) {
      Alert.alert('Faltan macros', 'Kcal, proteína, carbos y grasas por 100g son obligatorios.')
      return
    }

    const payload: ProposeInput = {
      name: name.trim(),
      category,
      kcalPer100g: parseFloat(kcal),
      proteinPer100g: parseFloat(protein),
      carbsPer100g: parseFloat(carbs),
      fatPer100g: parseFloat(fat),
      fiberPer100g: fiber ? parseFloat(fiber) : undefined,
      servingG: servingG ? parseFloat(servingG) : undefined,
      servingLabel: servingLabel.trim() || undefined,
      country: country.trim() || undefined,
      notes: notes.trim() || undefined,
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setLoading(true)
    try {
      await proposeFood(payload)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      reset()
      onSuccess()
      onClose()
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo enviar la propuesta. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'white' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingVertical: 16,
          borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
        }}>
          <TouchableOpacity onPress={() => { reset(); onClose() }} style={{ padding: 4 }}>
            <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>Proponer alimento</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={{ backgroundColor: '#1e3a5f', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, opacity: loading ? 0.6 : 1 }}
          >
            {loading
              ? <ActivityIndicator color="white" size="small" />
              : <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: 'white' }}>Enviar</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info */}
          <View style={{ backgroundColor: '#f0f9ff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#bae6fd' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#0c4a6e', lineHeight: 18 }}>
              Tu propuesta será revisada por el equipo de Medaliq. Una vez aprobada, estará disponible para todos los atletas.
            </Text>
          </View>

          {/* Identificación */}
          <View style={{ gap: 14 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Identificación
            </Text>
            <Field label="Nombre del alimento" value={name} onChange={setName} placeholder="Ej: Arepa de chócolo" required />
            <Field label="País de origen" value={country} onChange={setCountry} placeholder="Colombia" />
          </View>

          {/* Categoría */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Categoría</Text>
              <Text style={{ fontSize: 12, color: '#ef4444' }}>*</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => { Haptics.selectionAsync(); setCategory(c) }}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: category === c ? '#1e3a5f' : '#f3f4f6',
                    borderWidth: 1, borderColor: category === c ? '#1e3a5f' : '#e5e7eb',
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: category === c ? 'white' : '#374151' }}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Macros por 100g */}
          <View style={{ gap: 14 }}>
            <View>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Valores por 100g
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
                Campos obligatorios — revisa la etiqueta nutricional
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Kcal" value={kcal} onChange={setKcal} placeholder="350" keyboardType="decimal-pad" required />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Fibra (g)" value={fiber} onChange={setFiber} placeholder="2.5" keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Proteína (g)" value={protein} onChange={setProtein} placeholder="8" keyboardType="decimal-pad" required />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Carbos (g)" value={carbs} onChange={setCarbs} placeholder="65" keyboardType="decimal-pad" required />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Grasas (g)" value={fat} onChange={setFat} placeholder="4" keyboardType="decimal-pad" required />
              </View>
              <View style={{ flex: 1 }} />
            </View>
          </View>

          {/* Porción típica (opcional) */}
          <View style={{ gap: 14 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Porción típica (opcional)
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Gramos" value={servingG} onChange={setServingG} placeholder="150" keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Descripción" value={servingLabel} onChange={setServingLabel} placeholder="1 unidad mediana" />
              </View>
            </View>
          </View>

          {/* Notas */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Notas (opcional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Contexto adicional, marca, preparación..."
              placeholderTextColor="#d1d5db"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{
                backgroundColor: '#f9fafb', borderRadius: 10,
                paddingHorizontal: 14, paddingVertical: 12,
                fontSize: 14, fontFamily: 'Inter_400Regular', color: '#111827',
                borderWidth: 1, borderColor: '#e5e7eb', minHeight: 80,
              }}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={{ backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 18, alignItems: 'center', opacity: loading ? 0.7 : 1 }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Enviar propuesta</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}
