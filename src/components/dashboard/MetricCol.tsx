import { View, Text } from 'react-native'

type Props = {
  label: string
  value: string
  unit: string
  color: string
}

export default function MetricCol({ label, value, unit, color }: Props) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color }}>{value}</Text>
        {unit ? <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{unit}</Text> : null}
      </View>
      <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{label}</Text>
    </View>
  )
}
