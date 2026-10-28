import { View, Text, TouchableOpacity } from 'react-native'

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

type Props = {
  name: string
  headline: string | null
  initial: string
  unreadCount?: number
  onPress: () => void
}

export default function CoachCard({ name, headline, initial, unreadCount = 0, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ backgroundColor: 'white', borderRadius: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', ...SHADOW }}
    >
      <View style={{ width: 4, height: 52, backgroundColor: '#f97316' }} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, gap: 12 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: 'white' }}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>Coach {name.split(' ')[0]}</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 1 }}>{headline || 'Entrenador personal'}</Text>
        </View>
        {unreadCount > 0 && (
          <View style={{ alignItems: 'center' }}>
            <View style={{ backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: 'white' }}>{unreadCount}</Text>
            </View>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>mensajes</Text>
          </View>
        )}
        {unreadCount === 0 && (
          <Text style={{ fontSize: 14, color: '#d1d5db' }}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}
