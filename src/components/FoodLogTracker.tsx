import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { getFoodLogs, MacroTotals } from '../api/nutrition'
import LogFoodModal from './LogFoodModal'

const MACRO_COLORS = {
  kcal:     '#f97316',
  proteinG: '#3b82f6',
  carbsG:   '#eab308',
  fatG:     '#22c55e',
}

const MACRO_LABELS = {
  kcal:     { label: 'Calorías', unit: 'kcal' },
  proteinG: { label: 'Proteína', unit: 'g'    },
  carbsG:   { label: 'Carbos',   unit: 'g'    },
  fatG:     { label: 'Grasas',   unit: 'g'    },
}

type MacroKey = keyof typeof MACRO_COLORS

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const over = max > 0 && value > max
  return (
    <View style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
      <View style={{
        height: '100%',
        width: `${pct}%`,
        backgroundColor: over ? '#ef4444' : color,
        borderRadius: 4,
      }} />
    </View>
  )
}

type Props = {
  date?: string
}

export default function FoodLogTracker({ date }: Props) {
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['nutrition-log', date],
    queryFn: () => getFoodLogs(date),
    staleTime: 30 * 1000, // 30s
  })

  if (isLoading) {
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', padding: 20, alignItems: 'center' }}>
        <ActivityIndicator color="#1e3a5f" size="small" />
      </View>
    )
  }

  const totals: MacroTotals = data?.totals ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  const target: MacroTotals | null = data?.target ?? null
  const logs = data?.logs ?? []

  return (
    <>
      <View style={{ backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', padding: 20 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>
              LO QUE COMÍ HOY
            </Text>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
              {logs.length} {logs.length === 1 ? 'registro' : 'registros'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={{ backgroundColor: '#1e3a5f', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text style={{ color: 'white', fontSize: 18, lineHeight: 20 }}>+</Text>
            <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>Registrar</Text>
          </TouchableOpacity>
        </View>

        {/* Barras de progreso */}
        <View style={{ gap: 12 }}>
          {(Object.keys(MACRO_COLORS) as MacroKey[]).map(key => {
            const consumed = totals[key] ?? 0
            const tgt      = target?.[key] ?? 0
            const pct      = tgt > 0 ? Math.min(Math.round((consumed / tgt) * 100), 999) : 0
            const { label, unit } = MACRO_LABELS[key]
            return (
              <View key={key}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>{label}</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>
                    <Text style={{ color: MACRO_COLORS[key] }}>{consumed}{unit}</Text>
                    {target ? ` / ${tgt}${unit}` : ''}
                    {target ? <Text style={{ fontSize: 10, color: '#9ca3af' }}>  {pct}%</Text> : ''}
                  </Text>
                </View>
                <ProgressBar value={consumed} max={tgt} color={MACRO_COLORS[key]} />
              </View>
            )
          })}
        </View>

        {/* Lista rápida de logs recientes */}
        {logs.length > 0 && (
          <View style={{ marginTop: 16, gap: 8 }}>
            <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />
            {logs.slice(-3).map(log => {
              const r = log.grams / 100
              const kcal = Math.round(log.food.kcalPer100g * r)
              return (
                <View key={log.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#374151', flex: 1 }} numberOfLines={1}>
                    {log.food.name}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginLeft: 8 }}>
                    {log.grams}g · {kcal} kcal
                  </Text>
                </View>
              )
            })}
            {logs.length > 3 && (
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'center' }}>
                +{logs.length - 3} registros más
              </Text>
            )}
          </View>
        )}
      </View>

      <LogFoodModal visible={showModal} onClose={() => setShowModal(false)} date={date} />
    </>
  )
}
