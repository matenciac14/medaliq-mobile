import { View, Text, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import type { Router } from 'expo-router'

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

type Props = {
  router: Router
}

export default function FreeTodayCard({ router }: Props) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#ea580c' }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 8 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#ea580c', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          ● HOY
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 28 }}>🎯</Text>
          <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
            Sin sesión
          </Text>
        </View>
        <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
          Sin sesión planificada
        </Text>
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
          Registra tu entrenamiento de hoy
        </Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(app)/log-run') }}
          activeOpacity={0.85}
          style={{ backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 10, alignItems: 'center', width: '100%', marginTop: 2 }}
        >
          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: 'white' }}>
            Registrar actividad →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
