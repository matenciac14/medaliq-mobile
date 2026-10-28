import { View, Text } from 'react-native'

type HRZoneData = {
  z1: { min: number; max: number }
  z2: { min: number; max: number }
  z3: { min: number; max: number }
  z4: { min: number; max: number }
  z5: { min: number; max: number }
}

type Props = {
  hrZones: HRZoneData | null | undefined
}

const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#dc2626']

export default function ZonasFC({ hrZones }: Props) {
  const zones = hrZones
    ? [
        { label: 'Z1', range: `${hrZones.z1.min}-${hrZones.z1.max}`, color: '#3b82f6' },
        { label: 'Z2', range: `${hrZones.z2.min}-${hrZones.z2.max}`, color: '#22c55e' },
        { label: 'Z3', range: `${hrZones.z3.min}-${hrZones.z3.max}`, color: '#f97316' },
        { label: 'Z4', range: `${hrZones.z4.min}-${hrZones.z4.max}`, color: '#ef4444' },
        { label: 'Z5', range: `${hrZones.z5.min}+`, color: '#dc2626' },
      ]
    : ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((l, i) => ({ label: l, range: '— bpm', color: DEFAULT_COLORS[i] }))

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 14, ...SHADOW }}>
      <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827', marginBottom: 4 }}>
        Zonas FC
      </Text>
      {!hrZones && (
        <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#d1d5db', marginBottom: 8 }}>
          Completa tu perfil con FC máx para calcular tus zonas
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: hrZones ? 6 : 0 }}>
        {zones.map(z => (
          <View key={z.label} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: z.color, opacity: hrZones ? 1 : 0.3,
              marginBottom: 6,
            }} />
            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#111827' }}>{z.label}</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: hrZones ? '#9ca3af' : '#d1d5db', marginTop: 2 }}>
              {z.range}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
