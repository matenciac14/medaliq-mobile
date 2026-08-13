import { View, Text } from 'react-native'

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

type Props = {
  currentVolume: number | null
  volumeDeltaPct: number | null
  completedCount: number
  totalTraining: number
}

export default function HeroCarga({ currentVolume, volumeDeltaPct, completedCount, totalTraining }: Props) {
  if (currentVolume == null) return null
  const pct = totalTraining > 0 ? Math.round((completedCount / totalTraining) * 100) : 0

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#f97316' }} />
      <View style={{ padding: 14, flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
            🏃  CARGA SEMANAL
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontSize: 34, fontFamily: 'Inter_900Black', color: '#f97316', letterSpacing: -1 }}>
              {currentVolume}
            </Text>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>km</Text>
            {volumeDeltaPct != null && (
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: volumeDeltaPct >= 0 ? '#16a34a' : '#dc2626', marginLeft: 4 }}>
                {volumeDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(volumeDeltaPct)}% vs sem. anterior
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 4 }}>
            {pct}% del objetivo semanal
          </Text>
        </View>
        <View style={{ backgroundColor: '#f1f5f9', borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 70 }}>
          <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#f97316', letterSpacing: -0.5 }}>
            {pct}%
          </Text>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>
            del objetivo{'\n'}semanal
          </Text>
        </View>
      </View>
    </View>
  )
}
