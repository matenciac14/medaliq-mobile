import { View, Text, TouchableOpacity } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

type MacroTotals = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

type Props = {
  target: MacroTotals
  consumed: MacroTotals
  label?: string
  onPress?: () => void
}

const RING_SIZE = 120
const STROKE_WIDTH = 10
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const TRACK_COLOR = '#fef3e2'

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const pct = target > 0 ? Math.min(1, consumed / target) : 0
  const strokeDashoffset = CIRCUMFERENCE * (1 - pct)
  const remaining = Math.max(0, target - consumed)
  const over = consumed > target

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} stroke={TRACK_COLOR} strokeWidth={STROKE_WIDTH} fill="none" />
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
          stroke={over ? '#ef4444' : '#f97316'}
          strokeWidth={STROKE_WIDTH} fill="none"
          strokeDasharray={`${CIRCUMFERENCE}`} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={{ alignItems: 'center', gap: 1 }}>
        <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: consumed === 0 ? '#b3b3b3' : over ? '#ef4444' : '#1f3b5e', letterSpacing: -0.5 }}>
          {consumed === 0 ? '0' : consumed.toLocaleString('es')}
        </Text>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#8c99a6', textAlign: 'center' }}>kcal</Text>
      </View>
    </View>
  )
}

const MINI_RING_SIZE = 40
const MINI_STROKE = 4
const MINI_RADIUS = (MINI_RING_SIZE - MINI_STROKE) / 2
const MINI_CIRCUM = 2 * Math.PI * MINI_RADIUS

function MiniMacroRing({ value, max, color, label, bgColor }: { value: number; max: number; color: string; label: string; bgColor?: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const offset = MINI_CIRCUM * (1 - pct)

  return (
    <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
      <Svg width={MINI_RING_SIZE} height={MINI_RING_SIZE}>
        <Circle cx={MINI_RING_SIZE / 2} cy={MINI_RING_SIZE / 2} r={MINI_RADIUS} stroke={bgColor ?? TRACK_COLOR} strokeWidth={MINI_STROKE} fill="none" />
        <Circle
          cx={MINI_RING_SIZE / 2} cy={MINI_RING_SIZE / 2} r={MINI_RADIUS}
          stroke={color} strokeWidth={MINI_STROKE} fill="none"
          strokeDasharray={`${MINI_CIRCUM}`} strokeDashoffset={offset}
          strokeLinecap="round" rotation="-90"
          origin={`${MINI_RING_SIZE / 2}, ${MINI_RING_SIZE / 2}`}
        />
      </Svg>
      <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#1f3b5e' }}>{Math.round(value)}g</Text>
      <Text style={{ fontSize: 9, fontFamily: 'Inter_500Medium', color: '#8c99a6' }}>{label}</Text>
    </View>
  )
}

export default function NutritionProgressCard({ target, consumed, label, onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress}>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          padding: 16,
          minHeight: 180,
          borderWidth: 1,
          borderColor: '#f0f2f5',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <CalorieRing consumed={consumed.kcal} target={target.kcal} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#8c99a6', textTransform: 'uppercase', letterSpacing: 0.72 }}>
              {label ?? 'CALORIAS DE HOY'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
              <Text style={{ fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1f3b5e', lineHeight: 28 }}>
                {target.kcal.toLocaleString('es')}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#8c99a6' }}>
                kcal objetivo
              </Text>
            </View>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#8c99a6', marginTop: 2 }}>
              {consumed.kcal === 0 ? 'Sin registros hoy' : `${consumed.kcal.toLocaleString('es')} kcal consumidas`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
              <MiniMacroRing value={consumed.proteinG} max={target.proteinG} color="#3b82f6" bgColor="#edf2ff" label="Prot" />
              <MiniMacroRing value={consumed.carbsG} max={target.carbsG} color="#eab308" bgColor="#fef9c3" label="Carbs" />
              <MiniMacroRing value={consumed.fatG} max={target.fatG} color="#22c55e" bgColor="#dcfce7" label="Grasas" />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}
