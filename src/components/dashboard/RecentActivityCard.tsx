import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { SESSION_ICONS, SESSION_LABELS } from '../../constants/sessions'

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

type Activity = {
  type: string
  completedAt: string
  durationMin?: number | null
  rpe?: number | null
}

type Props = {
  activities: Activity[]
  streakDays: number
}

export default function RecentActivityCard({ activities, streakDays }: Props) {
  const router = useRouter()

  if (activities.length === 0) return null

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#ea580c' }} />
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>
          Actividad reciente
        </Text>
        {streakDays > 0 && (
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#ea580c' }}>🔥 {streakDays} dias de racha</Text>
        )}
      </View>
      <ScrollView style={{ maxHeight: 205 }}>
        {activities.slice(0, 4).map((a, i) => (
          <View
            key={i}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#f3f4f6' }}
          >
            <Text style={{ fontSize: 22 }}>{SESSION_ICONS[a.type] ?? '🏅'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                {SESSION_LABELS[a.type] ?? a.type.toLowerCase().replace(/_/g, ' ')}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 1 }}>
                {new Date(a.completedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                {a.durationMin ? ` · ${a.durationMin} min` : ''}
              </Text>
            </View>
            {a.rpe != null && (
              <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>RPE {a.rpe}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(app)/(tabs)/progress' as any) }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#ea580c' }}>Ver →</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
