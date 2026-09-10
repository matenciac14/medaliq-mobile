// Pantalla 1: Estado vacio del constructor — primer acceso B2C Pro
// Figma: 4523:3150 "Nutricion — Mobile · Constructor: Estado vacio"

import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { getNutritionPage } from '../../src/api/nutrition'

const FEATURES = [
  { icon: 'clipboard-outline' as const, title: 'Menu por tipo de dia', desc: 'Configura una vez para Duro, Facil y Descanso.' },
  { icon: 'calendar-outline' as const, title: 'Planificador semanal', desc: 'Aplica automaticamente a cada dia de la semana.' },
  { icon: 'bar-chart-outline' as const, title: 'Macros en tiempo real', desc: 'Proteina, carbos y grasas calculados al instante.' },
]

export default function NutritionConstructorScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const { data } = useQuery({ queryKey: ['nutrition-page'], queryFn: getNutritionPage })

  const targetHard = data?.macros?.kcal ?? 2850
  const targetEasy = Math.round(targetHard * 0.77)
  const targetRest = Math.round(targetHard * 0.63)

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1e3a5f', paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: 'white', flex: 1 }}>Nutricion</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' }}>
              {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#ea580c', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'white' }}>Dia Duro</Text>
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
          <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#111827', textAlign: 'center', marginTop: 12 }}>
            Tu primer plan de{'\n'}nutricion
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
            Define que comes en cada tipo de dia — Duro, Facil o Descanso — y el sistema lo aplica automaticamente a tu semana.
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
                <Ionicons name={f.icon} size={20} color="#1e3a5f" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{f.title}</Text>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA: Crear menu */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/nutrition-day-builder' as any)}
          style={{ backgroundColor: '#ea580c', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: 'white' }}>
            Crear menu nutricional →
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
          <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>
            Pedir a mi coach que lo configure
          </Text>
        </TouchableOpacity>

        {/* Metas por tipo de dia */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: 'Duro', icon: '🔥', kcal: targetHard },
            { label: 'Facil', icon: '✅', kcal: targetEasy },
            { label: 'Desc.', icon: '😴', kcal: targetRest },
          ].map(d => (
            <View
              key={d.label}
              style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' }}
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
