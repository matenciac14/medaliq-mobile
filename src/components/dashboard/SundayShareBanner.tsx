import { View, Text, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'

type Props = {
  completedCount: number
  totalTraining: number
  onPress: () => void
}

export default function SundayShareBanner({ completedCount, totalTraining, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress() }}
      activeOpacity={0.85}
      style={{ backgroundColor: '#1e3a5f', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, overflow: 'hidden' }}
    >
      <View style={{ width: 3, position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#ea580c' }} />
      <Text style={{ fontSize: 22 }}>📅</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: 'white' }}>
          {completedCount}/{totalTraining} sesiones esta semana
        </Text>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
          Comparte tu resumen semanal ↗
        </Text>
      </View>
      <View style={{ backgroundColor: '#ea580c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: 'white' }}>Compartir</Text>
      </View>
    </TouchableOpacity>
  )
}
