import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Props = {
  icon: string
  title: string
  description: string
}

export default function UpgradeWall({ icon, title, description }: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#f8fafc',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingBottom: insets.bottom + 32,
    }}>
      <Text style={{ fontSize: 56, marginBottom: 16 }}>{icon}</Text>
      <Text style={{
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: '#1e3a5f',
        textAlign: 'center',
        marginBottom: 8,
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
        maxWidth: 260,
      }}>
        {description}
      </Text>
      <TouchableOpacity
        onPress={() => router.push('/(app)/pricing' as any)}
        activeOpacity={0.85}
        style={{
          backgroundColor: '#f97316',
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 32,
        }}
      >
        <Text style={{
          color: 'white',
          fontSize: 15,
          fontFamily: 'Inter_700Bold',
        }}>
          Ver planes → Pro $9.99/mes
        </Text>
      </TouchableOpacity>
    </View>
  )
}
