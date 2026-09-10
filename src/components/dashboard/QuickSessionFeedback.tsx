import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import { apiFetch } from '../../api/client'
import { SESSION_ICONS, SESSION_LABELS } from '../../constants/sessions'

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

type Props = {
  sessionType: string
  durationMin: number
  zoneTarget: string
  logId: string | null
}

const OPTIONS = [
  { key: 'tired' as const, icon: '🌙', label: 'Cansado' },
  { key: 'regular' as const, icon: '⏰', label: 'Regular' },
  { key: 'strong' as const, icon: '💪', label: 'Fuerte' },
]

export default function QuickSessionFeedback({ sessionType, durationMin, zoneTarget, logId }: Props) {
  const [selected, setSelected] = useState<'tired' | 'regular' | 'strong' | null>(null)
  const label = SESSION_LABELS[sessionType] ?? sessionType.toLowerCase().replace(/_/g, ' ')
  const icon = SESSION_ICONS[sessionType] ?? '🏅'
  const zone = zoneTarget && zoneTarget !== 'N/A' && zoneTarget !== 'LIBRE' ? ` · ${zoneTarget}` : ''

  const handleSelect = async (feeling: 'tired' | 'regular' | 'strong') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelected(feeling)
    if (logId) {
      const rpeMap = { tired: 3, regular: 5, strong: 8 }
      try { await apiFetch(`/api/mobile/log/session/${logId}`, { method: 'PATCH', body: JSON.stringify({ rpe: rpeMap[feeling] }) }) } catch {}
    }
  }

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 18, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#22c55e' }} />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontSize: 10, fontFamily: 'Inter_700Bold' }}>✓</Text>
          </View>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#22c55e', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Sesión de hoy
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>
            {label} · {durationMin} min{zone}
          </Text>
        </View>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textAlign: 'center', marginBottom: 10 }}>
          ¿Cómo te sentiste?
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => handleSelect(opt.key)}
              activeOpacity={0.8}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
                borderWidth: selected === opt.key ? 2 : 1,
                borderColor: selected === opt.key ? '#1e3a5f' : '#e5e7eb',
                backgroundColor: selected === opt.key ? '#f0f4f8' : 'white',
              }}
            >
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{opt.icon}</Text>
              <Text style={{ fontSize: 11, fontFamily: selected === opt.key ? 'Inter_700Bold' : 'Inter_600SemiBold', color: selected === opt.key ? '#1e3a5f' : '#6b7280' }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  )
}
