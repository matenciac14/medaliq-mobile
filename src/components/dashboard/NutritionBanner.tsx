// KcalHeroCard/[Progress] — Circular ring progress + macros (matches Figma 5325:139)
// Fetches consumed data from /api/mobile/nutrition/log, receives target from props

import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { apiFetch } from '../../api/client'

type Props = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  label: string
  onPress: () => void
}

type Consumed = { kcal: number; proteinG: number; carbsG: number; fatG: number }

function RingProgress({ size, stroke, pct, color, bgColor }: {
  size: number; stroke: number; pct: number; color: string; bgColor: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(pct, 0), 100)
  const dashOffset = circumference * (1 - clamped / 100)

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={bgColor} strokeWidth={stroke} fill="none"
      />
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function MacroRing({ label, current, target, color, bgColor }: {
  label: string; current: number; target: number; color: string; bgColor: string
}) {
  const pct = target > 0 ? (current / target) * 100 : 0
  return (
    <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
      <RingProgress size={40} stroke={4} pct={pct} color={color} bgColor={bgColor} />
      <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#1f3b5e' }}>
        {current}g
      </Text>
      <Text style={{ fontSize: 9, fontFamily: 'Inter_500Medium', color: '#8c99a6' }}>
        {label}
      </Text>
    </View>
  )
}

export default function NutritionBanner({ kcal, proteinG, carbsG, fatG, onPress }: Props) {
  const [consumed, setConsumed] = useState<Consumed>({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ totals: Consumed }>('/api/mobile/nutrition/log')
      .then(d => {
        if (d.totals) setConsumed(d.totals)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const remaining = Math.max(0, kcal - consumed.kcal)
  const kcalPct = kcal > 0 ? (consumed.kcal / kcal) * 100 : 0

  return (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress() }}
      activeOpacity={0.85}
      style={{
        backgroundColor: 'white', borderRadius: 20, overflow: 'hidden',
        borderWidth: 1, borderColor: '#f0f2f5',
      }}
    >
      <View style={{ flexDirection: 'row', padding: 20, gap: 20 }}>
        {/* Left — big calorie ring */}
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <RingProgress size={120} stroke={10} pct={kcalPct} color="#f97316" bgColor="#fef3e2" />
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            {loading ? (
              <Text style={{ fontSize: 12, color: '#8c99a6' }}>...</Text>
            ) : (
              <>
                <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: '#1f3b5e', lineHeight: 24 }}>
                  {remaining.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#8c99a6' }}>
                  restantes
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Right — info column */}
        <View style={{ flex: 1, justifyContent: 'center', gap: 10 }}>
          {/* Title block */}
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#8c99a6', letterSpacing: 0.72 }}>
              CALORIAS DE HOY
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1f3b5e' }}>
                {kcal.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#8c99a6' }}>
                kcal objetivo
              </Text>
            </View>
            {!loading && (
              <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#8c99a6' }}>
                {consumed.kcal.toLocaleString()} kcal consumidas
              </Text>
            )}
          </View>

          {/* Macro rings row */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <MacroRing label="Prot" current={consumed.proteinG} target={proteinG} color="#3b82f6" bgColor="#edf2ff" />
            <MacroRing label="Carbs" current={consumed.carbsG} target={carbsG} color="#eab308" bgColor="#fef9c3" />
            <MacroRing label="Grasas" current={consumed.fatG} target={fatG} color="#22c55e" bgColor="#dcfce7" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}
