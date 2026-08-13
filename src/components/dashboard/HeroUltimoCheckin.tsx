import { View, Text } from 'react-native'

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

type Props = {
  lastCheckIn: {
    energyLevel: number | null
    hardestSessionRpe: number | null
    sleepHours: number | null
  }
  weightKg: number | null
  daysAgo: number | null
}

export default function HeroUltimoCheckin({ lastCheckIn, weightKg, daysAgo }: Props) {
  const daysLabel = daysAgo === 0 ? 'hoy' : daysAgo === 1 ? 'ayer' : daysAgo != null ? `hace ${daysAgo} días` : ''

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#1e3a5f' }} />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            🔔  ÚLTIMO CHECK-IN
          </Text>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
            {daysLabel}
          </Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>
              {lastCheckIn.hardestSessionRpe != null ? `${lastCheckIn.hardestSessionRpe}/10` : '—'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 4 }}>RPE</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>
              {lastCheckIn.energyLevel != null ? `${lastCheckIn.energyLevel}/5 ★` : '—'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 4 }}>Energía</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>
              {weightKg != null ? `${weightKg} kg` : '—'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 4 }}>Peso</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
