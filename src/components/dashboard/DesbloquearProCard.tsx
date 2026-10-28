import { View, Text, TouchableOpacity } from 'react-native'
import type { Router } from 'expo-router'

type Props = {
  router: Router
}

export default function DesbloquearProCard({ router }: Props) {
  return (
    <TouchableOpacity
      onPress={() => router.push('/(app)/pricing' as any)}
      activeOpacity={0.85}
      style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: 'rgba(234,89,9,0.3)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14 }}>⚡</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#993300' }}>
            Desbloquea Plan Pro
          </Text>
        </View>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#8c4d1a' }}>
          Check-in · zonas · progreso
        </Text>
      </View>
      <View style={{ backgroundColor: '#ea5909', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, width: 72, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'white' }}>Ver Pro</Text>
      </View>
    </TouchableOpacity>
  )
}
