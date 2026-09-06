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
  onPress?: () => void
}

const RING_SIZE = 110
const STROKE_WIDTH = 8
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const TRACK_COLOR = '#e5e7eb'

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
          stroke={over ? '#ef4444' : '#ea5807'}
          strokeWidth={STROKE_WIDTH} fill="none"
          strokeDasharray={`${CIRCUMFERENCE}`} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={{ alignItems: 'center', gap: 1 }}>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: consumed === 0 ? '#b3b3b3' : over ? '#ef4444' : '#1e3a5f', letterSpacing: -0.5 }}>
          {consumed === 0 ? '0' : consumed.toLocaleString('es')}
        </Text>
        <Text style={{ fontSize: 9, fontFamily: 'Inter_500Medium', color: '#9ca3af', textAlign: 'center' }}>kcal</Text>
      </View>
    </View>
  )
}

const MINI_RING_SIZE = 36
const MINI_STROKE = 3
const MINI_RADIUS = (MINI_RING_SIZE - MINI_STROKE) / 2
const MINI_CIRCUM = 2 * Math.PI * MINI_RADIUS

function MiniMacroRing({ value, max, color, label, bgColor }: { value: number; max: number; color: string; label: string; bgColor?: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const offset = MINI_CIRCUM * (1 - pct)

  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
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
      <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>{Math.round(value)}g</Text>
      <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{label}</Text>
    </View>
  )
}

export default function NutritionProgressCard({ target, consumed, onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress}>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <CalorieRing consumed={consumed.kcal} target={target.kcal} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.2 }}>
              CALORÍAS DE HOY
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', lineHeight: 32, letterSpacing: -0.5 }}>
                {target.kcal.toLocaleString('es')}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                kcal objetivo
              </Text>
            </View>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
              {consumed.kcal === 0 ? 'Sin registros hoy' : `${consumed.kcal.toLocaleString('es')} kcal consumidas`}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingRight: 8 }}>
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
