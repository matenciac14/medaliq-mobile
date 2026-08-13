import { View, Text, TouchableOpacity } from 'react-native'

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

type Props = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  label: string
  onPress: () => void
}

export default function NutritionBanner({ kcal, proteinG, carbsG, fatG, label, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, ...SHADOW }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 13 }}>🍽️</Text>
        <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase', marginLeft: 6, flex: 1 }}>
          NUTRICIÓN HOY · objetivo base
        </Text>
        <View style={{ backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: 'white', textTransform: 'uppercase' }}>{label}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
        <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>{kcal}</Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>kcal</Text>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginLeft: 4 }}>ajustado por sesión</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>P {proteinG}g</Text>
        </View>
        <View style={{ backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>C {carbsG}g</Text>
        </View>
        <View style={{ backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>G {fatG}g</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
