import { View, Text } from 'react-native'

const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
}

export default function KPICards({ completed, total, volumeLabel, adherencePct }: {
  completed: number; total: number; volumeLabel: string; adherencePct: number | null
}) {
  const belowTarget = adherencePct !== null && adherencePct < 80
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', padding: 12, ...SHADOW }}>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Completadas</Text>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#111827' }}>{completed}/{total}</Text>
        <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>sesiones</Text>
      </View>
      <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', padding: 12, ...SHADOW }}>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Volumen</Text>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#111827' }}>{volumeLabel}</Text>
        <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>esta semana</Text>
      </View>
      <View style={{
        flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12, ...SHADOW,
        borderWidth: belowTarget ? 2 : 1,
        borderColor: belowTarget ? 'rgba(234,88,12,0.3)' : '#f1f5f9',
      }}>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Adherencia</Text>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#ea580c' }}>
          {adherencePct !== null ? `${adherencePct}%` : '—'}
        </Text>
        <Text style={{ fontSize: 10, color: belowTarget ? '#ef4444' : '#9ca3af', marginTop: 2 }}>
          {belowTarget ? '↓ meta 80%' : 'esta semana'}
        </Text>
      </View>
    </View>
  )
}
