import { View, Text, TouchableOpacity } from 'react-native'
import type { Router } from 'expo-router'

type Props = {
  router: Router
}

export default function FindCoachCard({ router }: Props) {
  return (
    <TouchableOpacity
      onPress={() => router.push('/(app)/find-coach' as any)}
      activeOpacity={0.85}
      style={{ backgroundColor: '#1e3a5f', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 14, overflow: 'hidden' }}
    >
      <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: '#ea5909' }} />
      <View style={{ flex: 1, gap: 2, paddingVertical: 10 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
          🎯  Encuentra tu entrenador
        </Text>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#b2cce5' }}>
          Planes personalizados con un experto
        </Text>
      </View>
      <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#ea5909' }}>Ver coaches →</Text>
    </TouchableOpacity>
  )
}
