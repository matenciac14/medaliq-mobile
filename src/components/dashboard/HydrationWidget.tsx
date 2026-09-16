// NUT-WATER-01 — Widget de hidratacion diaria (compacto, 1 fila)
// Emoji + valor/barra | 4 botones (-250/+250/+500/+1L)

import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import { apiFetch } from '../../api/client'

const REMOVE_BUTTON = { label: '-250', delta: -250 }

const ADD_BUTTONS = [
  { label: '+250', delta: 250 },
  { label: '+500', delta: 500 },
  { label: '+1L',  delta: 1000 },
]

type Props = {
  initialMl?: number
  initialTarget?: number
}

export default function HydrationWidget({ initialMl, initialTarget }: Props = {}) {
  const hasInitial = initialMl !== undefined
  const [mlLogged, setMlLogged]    = useState(initialMl ?? 0)
  const [waterMlTarget, setTarget] = useState(initialTarget ?? 2000)
  const [loading, setLoading]      = useState(!hasInitial)
  const [adding, setAdding]        = useState<number | null>(null)

  useEffect(() => {
    if (hasInitial) return
    apiFetch<{ mlLogged: number; waterMlTarget: number }>('/api/mobile/nutrition/water')
      .then(d => {
        setMlLogged(d.mlLogged ?? 0)
        setTarget(d.waterMlTarget ?? 2000)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [hasInitial])

  async function handleAdd(delta: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setAdding(delta)
    const prev = mlLogged
    const optimistic = Math.max(0, mlLogged + delta)
    setMlLogged(optimistic)
    try {
      const data = await apiFetch<{ mlLogged: number }>('/api/mobile/nutrition/water', {
        method: 'POST',
        body: { delta },
      })
      setMlLogged(data.mlLogged ?? optimistic)
    } catch {
      setMlLogged(prev)
    } finally {
      setAdding(null)
    }
  }

  const pct = waterMlTarget > 0 ? Math.min((mlLogged / waterMlTarget) * 100, 100) : 0
  const liters = (mlLogged / 1000).toFixed(1)
  const targetL = (waterMlTarget / 1000).toFixed(1)

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'white',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      paddingHorizontal: 14,
      paddingVertical: 10,
    }}>
      {/* Left: emoji + value + bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 16 }}>💧</Text>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            {loading ? (
              <Text style={{ fontSize: 10, color: '#9ca3af' }}>...</Text>
            ) : (
              <>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#3b82f6', lineHeight: 19 }}>{liters}</Text>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>/ {targetL} L</Text>
              </>
            )}
          </View>
          <View style={{ height: 4, width: 80, backgroundColor: '#edf2ff', borderRadius: 2, marginTop: 3 }}>
            <View style={{ height: 4, width: `${pct}%` as any, maxWidth: 80, backgroundColor: '#3b82f6', borderRadius: 2 }} />
          </View>
        </View>
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Right: 4 buttons (-250 red + 3 add blue) */}
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <TouchableOpacity
          onPress={() => handleAdd(REMOVE_BUTTON.delta)}
          disabled={adding !== null || mlLogged === 0}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: '#fef2f2',
            opacity: adding !== null || mlLogged === 0 ? 0.5 : 1,
          }}
        >
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#dc2626' }}>
            {adding === REMOVE_BUTTON.delta ? '...' : REMOVE_BUTTON.label}
          </Text>
        </TouchableOpacity>
        {ADD_BUTTONS.map(({ label, delta }) => (
          <TouchableOpacity
            key={delta}
            onPress={() => handleAdd(delta)}
            disabled={adding !== null}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: '#edf2ff',
              opacity: adding !== null ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#2e61c2' }}>
              {adding === delta ? '...' : label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
