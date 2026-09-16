// Pantalla 1: Estado vacio del constructor — primer acceso B2C Pro
// Figma: 4523:3150 "Nutricion — Mobile · Constructor: Estado vacio"

import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { getNutritionPage } from '../../src/api/nutrition'

const FEATURES = [
  { emoji: '🍽️', title: 'Menú por tipo de día', desc: 'Configura una vez para Duro, Fácil y Descanso.' },
  { emoji: '📅', title: 'Planificador semanal', desc: 'Aplica automáticamente a cada día de la semana.' },
  { emoji: '📊', title: 'Macros en tiempo real', desc: 'Proteína, carbos y grasas calculados al instante.' },
]

export default function NutritionConstructorScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const { data } = useQuery({ queryKey: ['nutrition-page'], queryFn: getNutritionPage })

  const targetHard = data?.dayTargets?.hard?.kcal ?? 0
  const targetEasy = data?.dayTargets?.easy?.kcal ?? 0
  const targetRest = data?.dayTargets?.rest?.kcal ?? 0

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1e3a5f', paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: 'white', flex: 1 }}>Nutrición</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' }}>
              {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#ea580c', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'white' }}>🔥 Día Duro</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={{ backgroundColor: '#fff7ed', borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#fed7aa' }}>
          <Text style={{ fontSize: 44 }}>📋</Text>
          <Text style={{ fontSize: 20, fontFamily: 'Inter_800ExtraBold', color: '#1e3a5f', textAlign: 'center', marginTop: 12 }}>
            Tu primer plan de{'\n'}nutrición
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6a7788', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
            Define qué comes en cada tipo de día — Duro, Fácil o Descanso — y el sistema lo aplica automáticamente a tu semana.
          </Text>
        </View>

        {/* Features list */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
          {FEATURES.map((f, i) => (
            <View
              key={f.title}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
                borderBottomWidth: i < FEATURES.length - 1 ? 1 : 0, borderBottomColor: '#f3f4f6',
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>{f.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>{f.title}</Text>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6a7788', marginTop: 2 }}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA: Crear menu */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/nutrition-day-builder' as any)}
          style={{ backgroundColor: '#ea580c', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: 'white' }}>
            Crear menú nutricional →
          </Text>
        </TouchableOpacity>

        {/* CTA secundario */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: 'white', borderRadius: 16, paddingVertical: 14,
            alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0',
          }}
        >
          <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>
            Pedir a mi coach que lo configure
          </Text>
        </TouchableOpacity>

        {/* Metas por tipo de dia */}
        <View style={{ backgroundColor: '#f5f7fa', borderRadius: 14, padding: 14, flexDirection: 'row' }}>
          {[
            { label: 'Duro', icon: '🔥', kcal: targetHard },
            { label: 'Fácil', icon: '✅', kcal: targetEasy },
            { label: 'Desc.', icon: '😴', kcal: targetRest },
          ].map((d, i) => (
            <View
              key={d.label}
              style={{ flex: 1, alignItems: 'center', borderRightWidth: i < 2 ? 1 : 0, borderRightColor: '#e2e8f0' }}
            >
              <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>{d.icon} {d.label}</Text>
              <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#1e3a5f', marginTop: 2 }}>
                {d.kcal.toLocaleString()} kcal
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
