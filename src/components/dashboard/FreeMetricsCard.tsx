import { View, Text } from 'react-native'
import MetricCol from './MetricCol'

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

type Props = {
  currentWeight: number | null
  targetWeight: number | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null
}

export default function FreeMetricsCard({ currentWeight, targetWeight, weeklyWeightChange, weightProgressPct }: Props) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#1e3a5f' }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>Tu progreso</Text>
          {weeklyWeightChange != null && (
            <View style={{ backgroundColor: weeklyWeightChange < 0 ? '#dcfce7' : '#fee2e2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: weeklyWeightChange < 0 ? '#166534' : '#ef4444' }}>
                {weeklyWeightChange > 0 ? '+' : ''}{weeklyWeightChange.toFixed(1)} kg/sem
              </Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <MetricCol label="Peso" value={currentWeight ? currentWeight.toFixed(1) : '--'} unit="kg" color="#1e3a5f" />
          <MetricCol label="Meta" value={targetWeight ? String(targetWeight) : '--'} unit="kg" color="#22c55e" />
          <MetricCol label="Progreso" value={weightProgressPct != null ? String(weightProgressPct) : '--'} unit="%" color="#1e3a5f" />
        </View>
      </View>
    </View>
  )
}
