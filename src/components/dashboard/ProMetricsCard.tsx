import { View, Text } from 'react-native'
import MetricCol from './MetricCol'

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

const FORM_ACCENT = {
  good:     { accent: '#22c55e', statusText: '#166534', chipBg: '#dcfce7', chipText: '#166534', label: 'Buena forma' },
  moderate: { accent: '#f59e0b', statusText: '#92400e', chipBg: '#fef3c7', chipText: '#92400e', label: 'Moderado' },
  rest:     { accent: '#ef4444', statusText: '#991b1b', chipBg: '#fee2e2', chipText: '#991b1b', label: 'Descanso' },
}

type Props = {
  formStatus: 'good' | 'moderate' | 'rest'
  formMessage: string
  lastCheckIn: { hardestSessionRpe: number | null; energyLevel: number | null; sleepHours: number | null } | null
  formCheckInDaysAgo: number | null
  currentWeight: number | null
  targetWeight: number | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null
  currentVolume: number | null
  volumeDeltaPct: number | null
  isRecomp: boolean
  raceDays: number | null
}

export default function ProMetricsCard({ formStatus, formMessage, lastCheckIn, formCheckInDaysAgo, currentWeight, targetWeight, weeklyWeightChange, weightProgressPct, currentVolume, volumeDeltaPct, isRecomp, raceDays }: Props) {
  const c = FORM_ACCENT[formStatus]
  const daysLabel = formCheckInDaysAgo === 0 ? 'hoy' : formCheckInDaysAgo === 1 ? 'ayer' : formCheckInDaysAgo != null ? `hace ${formCheckInDaysAgo} d` : ''

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: c.accent }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: c.statusText }}>{formMessage}</Text>
            <View style={{ backgroundColor: c.chipBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: c.chipText }}>{c.label}</Text>
            </View>
          </View>
          {daysLabel ? <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{daysLabel}</Text> : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 4 }}>
          <MetricCol label="Peso" value={currentWeight ? currentWeight.toFixed(1) : '--'} unit="kg" color="#1e3a5f" />
          <MetricCol label="RPE" value={lastCheckIn?.hardestSessionRpe != null ? String(lastCheckIn.hardestSessionRpe) : '--'} unit="/10" color="#ea580c" />
          <MetricCol label="Energia" value={lastCheckIn?.energyLevel != null ? `${lastCheckIn.energyLevel}/5` : '--'} unit="" color="#22c55e" />
          <MetricCol label="Carga" value={currentVolume != null ? String(currentVolume) : '--'} unit="km" color="#1e3a5f" />
        </View>

        {raceDays != null && raceDays > 0 && !isRecomp && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ fontSize: 12 }}>🏁</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f', flex: 1 }}>{raceDays} dias para tu carrera</Text>
            {weightProgressPct != null && (
              <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>Peso {weightProgressPct}%</Text>
            )}
          </View>
        )}

        {isRecomp && currentWeight != null && targetWeight != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ fontSize: 12 }}>🎯</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f', flex: 1 }}>
              {Math.abs(currentWeight - targetWeight).toFixed(1)} kg restantes
            </Text>
            {weeklyWeightChange != null && (
              <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: weeklyWeightChange < 0 ? '#22c55e' : '#ef4444' }}>
                {weeklyWeightChange > 0 ? '+' : ''}{weeklyWeightChange.toFixed(1)} kg/sem
              </Text>
            )}
          </View>
        )}

        {volumeDeltaPct != null && (
          <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: volumeDeltaPct >= 0 ? '#22c55e' : '#ef4444' }}>
            {volumeDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(volumeDeltaPct)}% carga vs sem. anterior
          </Text>
        )}
      </View>
    </View>
  )
}
