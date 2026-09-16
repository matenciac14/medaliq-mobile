import { View, Text, TouchableOpacity } from 'react-native'
import Svg, { Circle, Ellipse, Rect, Path } from 'react-native-svg'
import { useState } from 'react'

export type FatigueLevel = 0 | 1 | 2 | 3

export type MuscleEntry = {
  fatigueLevel: FatigueLevel
  volume?: number
  sets?: number
  lastTrainedAt?: string
}

export type MuscleData = Record<string, MuscleEntry>

export interface MuscleMapProps {
  data: MuscleData
  style?: object
}

const FATIGUE_COLORS: Record<FatigueLevel, string> = {
  0: '#E5E7EB',
  1: '#FEF3C7',
  2: '#FED7AA',
  3: '#EA580C',
}

const BG = '#F3F4F6'
const OUTLINE = '#D1D5DB'

function getColor(keys: string[], data: MuscleData): string {
  let max: FatigueLevel = 0
  for (const k of keys) {
    const lvl = data[k]?.fatigueLevel ?? 0
    if (lvl > max) max = lvl as FatigueLevel
  }
  return FATIGUE_COLORS[max]
}

// Shared body silhouette background elements (front & back share same outline)
function BodySilhouette() {
  return (
    <>
      {/* Head */}
      <Circle cx={90} cy={26} r={20} fill={BG} stroke={OUTLINE} strokeWidth={1} />
      {/* Neck */}
      <Rect x={83} y={44} width={14} height={14} rx={4} fill={BG} stroke={OUTLINE} strokeWidth={1} />
      {/* Torso */}
      <Path
        d="M 62 56 Q 50 62 42 70 L 34 98 L 30 132 L 36 160 L 46 164 L 64 168 L 116 168 L 134 164 L 144 160 L 150 132 L 146 98 L 138 70 Q 130 62 118 56 Z"
        fill={BG} stroke={OUTLINE} strokeWidth={1}
      />
      {/* Left upper arm */}
      <Rect x={22} y={68} width={18} height={52} rx={8} fill={BG} stroke={OUTLINE} strokeWidth={1} />
      {/* Right upper arm */}
      <Rect x={140} y={68} width={18} height={52} rx={8} fill={BG} stroke={OUTLINE} strokeWidth={1} />
      {/* Left forearm */}
      <Rect x={24} y={122} width={15} height={40} rx={7} fill={BG} stroke={OUTLINE} strokeWidth={1} />
      {/* Right forearm */}
      <Rect x={141} y={122} width={15} height={40} rx={7} fill={BG} stroke={OUTLINE} strokeWidth={1} />
      {/* Hip connector */}
      <Rect x={60} y={164} width={60} height={18} rx={6} fill={BG} stroke={OUTLINE} strokeWidth={1} />
      {/* Left upper leg */}
      <Rect x={58} y={178} width={28} height={68} rx={12} fill={BG} stroke={OUTLINE} strokeWidth={1} />
      {/* Right upper leg */}
      <Rect x={94} y={178} width={28} height={68} rx={12} fill={BG} stroke={OUTLINE} strokeWidth={1} />
      {/* Left lower leg */}
      <Rect x={60} y={248} width={24} height={58} rx={10} fill={BG} stroke={OUTLINE} strokeWidth={1} />
      {/* Right lower leg */}
      <Rect x={96} y={248} width={24} height={58} rx={10} fill={BG} stroke={OUTLINE} strokeWidth={1} />
    </>
  )
}

function FrontBody({ data }: { data: MuscleData }) {
  const delt = getColor(['shoulders', 'delts'], data)
  const chest = getColor(['chest', 'pectorals'], data)
  const bicep = getColor(['upper arms', 'biceps'], data)
  const forearm = getColor(['lower arms', 'forearms'], data)
  const abs = getColor(['waist', 'abs'], data)
  const quad = getColor(['upper legs', 'quads'], data)
  const calf = getColor(['lower legs', 'calves'], data)

  return (
    <Svg width={180} height={320} viewBox="0 0 180 320">
      <BodySilhouette />
      {/* Left deltoid */}
      <Ellipse cx={39} cy={78} rx={13} ry={9} fill={delt} opacity={0.9} />
      {/* Right deltoid */}
      <Ellipse cx={141} cy={78} rx={13} ry={9} fill={delt} opacity={0.9} />
      {/* Chest */}
      <Ellipse cx={90} cy={102} rx={26} ry={18} fill={chest} opacity={0.9} />
      {/* Left bicep */}
      <Ellipse cx={30} cy={88} rx={8} ry={18} fill={bicep} opacity={0.9} />
      {/* Right bicep */}
      <Ellipse cx={150} cy={88} rx={8} ry={18} fill={bicep} opacity={0.9} />
      {/* Left forearm */}
      <Ellipse cx={30} cy={136} rx={7} ry={16} fill={forearm} opacity={0.9} />
      {/* Right forearm */}
      <Ellipse cx={150} cy={136} rx={7} ry={16} fill={forearm} opacity={0.9} />
      {/* Abs */}
      <Rect x={80} y={122} width={20} height={40} rx={5} fill={abs} opacity={0.9} />
      {/* Left quad */}
      <Ellipse cx={72} cy={208} rx={17} ry={30} fill={quad} opacity={0.9} />
      {/* Right quad */}
      <Ellipse cx={108} cy={208} rx={17} ry={30} fill={quad} opacity={0.9} />
      {/* Left calf */}
      <Ellipse cx={72} cy={268} rx={11} ry={22} fill={calf} opacity={0.9} />
      {/* Right calf */}
      <Ellipse cx={108} cy={268} rx={11} ry={22} fill={calf} opacity={0.9} />
    </Svg>
  )
}

function BackBody({ data }: { data: MuscleData }) {
  const trap = getColor(['neck', 'traps'], data)
  const upperBack = getColor(['back', 'upper back'], data)
  const lat = getColor(['back', 'lats'], data)
  const tricep = getColor(['upper arms', 'triceps'], data)
  const forearm = getColor(['lower arms', 'forearms'], data)
  const lowerBack = getColor(['back', 'lower back'], data)
  const glute = getColor(['upper legs', 'glutes'], data)
  const hamstring = getColor(['upper legs', 'hamstrings'], data)
  const calf = getColor(['lower legs', 'calves'], data)

  return (
    <Svg width={180} height={320} viewBox="0 0 180 320">
      <BodySilhouette />
      {/* Traps */}
      <Ellipse cx={90} cy={74} rx={24} ry={10} fill={trap} opacity={0.9} />
      {/* Upper back */}
      <Rect x={72} y={84} width={36} height={22} rx={5} fill={upperBack} opacity={0.9} />
      {/* Left lat */}
      <Ellipse cx={54} cy={112} rx={20} ry={26} fill={lat} opacity={0.9} />
      {/* Right lat */}
      <Ellipse cx={126} cy={112} rx={20} ry={26} fill={lat} opacity={0.9} />
      {/* Left tricep */}
      <Ellipse cx={30} cy={88} rx={8} ry={18} fill={tricep} opacity={0.9} />
      {/* Right tricep */}
      <Ellipse cx={150} cy={88} rx={8} ry={18} fill={tricep} opacity={0.9} />
      {/* Left forearm */}
      <Ellipse cx={30} cy={136} rx={7} ry={16} fill={forearm} opacity={0.9} />
      {/* Right forearm */}
      <Ellipse cx={150} cy={136} rx={7} ry={16} fill={forearm} opacity={0.9} />
      {/* Lower back */}
      <Rect x={74} y={138} width={32} height={22} rx={5} fill={lowerBack} opacity={0.9} />
      {/* Left glute */}
      <Ellipse cx={72} cy={188} rx={22} ry={18} fill={glute} opacity={0.9} />
      {/* Right glute */}
      <Ellipse cx={108} cy={188} rx={22} ry={18} fill={glute} opacity={0.9} />
      {/* Left hamstring */}
      <Ellipse cx={72} cy={220} rx={15} ry={24} fill={hamstring} opacity={0.9} />
      {/* Right hamstring */}
      <Ellipse cx={108} cy={220} rx={15} ry={24} fill={hamstring} opacity={0.9} />
      {/* Left calf */}
      <Ellipse cx={72} cy={268} rx={11} ry={22} fill={calf} opacity={0.9} />
      {/* Right calf */}
      <Ellipse cx={108} cy={268} rx={11} ry={22} fill={calf} opacity={0.9} />
    </Svg>
  )
}

export default function MuscleMap({ data, style }: MuscleMapProps) {
  const [view, setView] = useState<'front' | 'back'>('front')

  return (
    <View style={[{ alignItems: 'center', gap: 12 }, style]}>
      {view === 'front' ? <FrontBody data={data} /> : <BackBody data={data} />}

      {/* Front/Back toggle */}
      <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 2 }}>
        {(['front', 'back'] as const).map(v => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            style={{
              paddingHorizontal: 20, paddingVertical: 6, borderRadius: 8,
              backgroundColor: view === v ? 'white' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: view === v ? '#1e3a5f' : '#9ca3af' }}>
              {v === 'front' ? 'Frente' : 'Espalda'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {([
          [0, 'Sin trabajo'],
          [1, 'Activo'],
          [2, 'Moderado'],
          [3, 'Intenso'],
        ] as [FatigueLevel, string][]).map(([level, label]) => (
          <View key={level} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: FATIGUE_COLORS[level] }} />
            <Text style={{ fontSize: 10, color: '#6b7280', fontFamily: 'Inter_400Regular' }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
