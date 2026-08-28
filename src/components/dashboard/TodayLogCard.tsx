import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { apiFetch } from '../../api/client'

type Props = {
  initial: { weightKg: number | null; energyLevel: number | null } | null
}

export default function TodayLogCard({ initial }: Props) {
  const [weightInput, setWeightInput] = useState(initial?.weightKg != null ? String(initial.weightKg) : '')
  const [energy, setEnergy] = useState<number | null>(initial?.energyLevel ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(!initial)

  async function save() {
    const weightKg = weightInput ? parseFloat(weightInput) : undefined
    if (!weightKg && !energy) return
    setSaving(true)
    try {
      await apiFetch('/api/mobile/metrics/log', {
        method: 'POST',
        body: JSON.stringify({ ...(weightKg && { weightKg }), ...(energy && { energyLevel: energy }) }),
      })
      setSaved(true)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 10 }}>
      <TouchableOpacity onPress={() => setOpen(o => !o)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 15 }}>📋</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>Registro de hoy</Text>
          {(initial || saved) && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' }} />}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {initial?.weightKg && !open && (
            <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#374151' }}>{initial.weightKg} kg</Text>
          )}
          {initial?.energyLevel && !open && (
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#f97316' }}>E{initial.energyLevel}/5</Text>
          )}
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#9ca3af" />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6b7280', width: 60 }}>Peso (kg)</Text>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="ej. 70.5"
              placeholderTextColor="#d1d5db"
              keyboardType="decimal-pad"
              style={{ flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827', backgroundColor: '#f9fafb' }}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6b7280' }}>Energia</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => { Haptics.selectionAsync(); setEnergy(n) }}
                  style={{ flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: energy === n ? '#f97316' : '#f3f4f6' }}
                >
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: energy === n ? 'white' : '#6b7280' }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'center' }}>1 = sin energía · 5 = excelente</Text>
          </View>
          <TouchableOpacity
            onPress={save}
            disabled={saving}
            style={{ backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: 'white' }}>{saving ? 'Guardando...' : 'Guardar'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
