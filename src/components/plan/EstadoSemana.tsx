import { View, Text } from 'react-native'

type Props = {
  checkInData: {
    energyLevel: number | null
    sleepHours: number | null
    stressLevel: number | null
    motivationLevel: number | null
  } | null
  formStatus?: 'good' | 'moderate' | 'rest' | null
  formMessage?: string | null
  lastCheckinDaysAgo?: number | null
}

const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  good:     { bg: '#f0fdf4', text: '#16a34a', label: 'Buen estado' },
  moderate: { bg: '#fffbeb', text: '#d97706', label: 'Moderado' },
  rest:     { bg: '#fef2f2', text: '#ef4444', label: 'Necesitas descanso' },
}

export default function EstadoSemana({ checkInData, formStatus, formMessage, lastCheckinDaysAgo }: Props) {
  const { energyLevel, sleepHours, stressLevel, motivationLevel } = checkInData ?? {}

  const items = [
    { label: 'Energia', value: energyLevel != null ? `${energyLevel}/5` : '—', icon: '⚡' },
    { label: 'Sueno', value: sleepHours != null ? `${sleepHours}h` : '—', icon: '😴' },
    { label: 'Estres', value: stressLevel != null ? `${stressLevel}/5` : '—', icon: '😤' },
    { label: 'Motiv.', value: motivationLevel != null ? `${motivationLevel}/5` : '—', icon: '💪' },
  ]

  const statusCfg = formStatus ? STATUS_CONFIG[formStatus] : null

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 14, ...SHADOW }}>
      {/* Header with interpreted status */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827' }}>
          Tu estado esta semana
        </Text>
        {statusCfg && (
          <View style={{ backgroundColor: statusCfg.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: statusCfg.text }}>
              {statusCfg.label}
            </Text>
          </View>
        )}
      </View>

      {/* Interpreted message */}
      {formMessage && (
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280', marginBottom: 10 }}>
          {formMessage}
        </Text>
      )}

      {/* Raw metrics */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {items.map(i => (
          <View key={i.label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, marginBottom: 4 }}>{i.icon}</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{i.value}</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>{i.label}</Text>
          </View>
        ))}
      </View>

      {/* Days since last check-in */}
      {lastCheckinDaysAgo != null && lastCheckinDaysAgo > 0 && (
        <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'right', marginTop: 8 }}>
          Hace {lastCheckinDaysAgo} {lastCheckinDaysAgo === 1 ? 'dia' : 'dias'}
        </Text>
      )}
    </View>
  )
}
