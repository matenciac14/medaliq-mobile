import { View, Text } from 'react-native'

type Props = {
  weightKg: number | null
  weightGoalKg: number | null
  weeklyWeightChange: number | null
  waistCm?: number | null
  hipsCm?: number | null
  thighsCm?: number | null
}

const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
}

export default function BodyComposition({
  weightKg, weightGoalKg, weeklyWeightChange, waistCm, hipsCm, thighsCm,
}: Props) {
  const hasWeight = weightKg != null
  const hasMeasures = waistCm != null || hipsCm != null || thighsCm != null
  const isEmpty = !hasWeight && !hasMeasures

  const changeBadge = weeklyWeightChange != null && weeklyWeightChange !== 0
    ? (() => {
        const abs = Math.abs(weeklyWeightChange)
        const isLoss = weeklyWeightChange < 0
        const isHealthy = isLoss && abs >= 0.2 && abs <= 0.8
        const suffix = isHealthy ? ' · ritmo ideal' : abs > 1 ? ' · ritmo alto' : ''
        return {
          label: `${isLoss ? '↓' : '↑'} ${abs.toFixed(1)} kg/sem${suffix}`,
          color: isLoss && isHealthy ? '#16a34a' : isLoss ? '#f97316' : weeklyWeightChange > 0.5 ? '#ef4444' : '#f97316',
          bg: isLoss && isHealthy ? '#f0fdf4' : isLoss ? '#fff7ed' : weeklyWeightChange > 0.5 ? '#fef2f2' : '#fff7ed',
        }
      })()
    : null

  const measures = [
    { label: 'Cintura', value: waistCm, unit: 'cm' },
    { label: 'Cadera', value: hipsCm, unit: 'cm' },
    { label: 'Muslo', value: thighsCm, unit: 'cm' },
  ].filter(m => m.value != null)

  const EMPTY_MEASURES = ['Cintura', 'Cadera', 'Brazo', 'Muslo']

  if (isEmpty) {
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 14, ...SHADOW }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827' }}>
            Composición corporal
          </Text>
          <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#94a3b8' }}>
              Sin datos
            </Text>
          </View>
        </View>

        {/* Weight empty */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
          <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#d1d5db', letterSpacing: -1 }}>
            —
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#d1d5db' }}>kg</Text>
        </View>

        {/* Measures empty row */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {EMPTY_MEASURES.map(label => (
            <View key={label} style={{
              flex: 1, backgroundColor: '#f8fafc', borderRadius: 10,
              paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center',
            }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginBottom: 4 }}>
                {label}
              </Text>
              <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#d1d5db' }}>
                — cm
              </Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 14, ...SHADOW }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827' }}>
          Composición corporal
        </Text>
        {changeBadge && (
          <View style={{ backgroundColor: changeBadge.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: changeBadge.color }}>
              {changeBadge.label}
            </Text>
          </View>
        )}
      </View>

      {/* Metrics row — weight + measures inline with dividers */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 0 }}>
        {/* Weight column */}
        {hasWeight && (
          <View style={{ marginRight: measures.length > 0 ? 12 : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -1 }}>
                {weightKg!.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#9ca3af' }}>kg</Text>
            </View>
            {weightGoalKg != null && (
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
                → meta {weightGoalKg.toFixed(1)} kg
              </Text>
            )}
          </View>
        )}

        {/* Divider */}
        {hasWeight && measures.length > 0 && (
          <View style={{ width: 1, backgroundColor: '#e5e7eb', alignSelf: 'stretch', marginHorizontal: 12, marginVertical: 4 }} />
        )}

        {/* Measures */}
        {measures.length > 0 && (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 0 }}>
            {measures.map((m, idx) => (
              <View key={m.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                    {m.value} {m.unit}
                  </Text>
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
                    {m.label}
                  </Text>
                </View>
                {idx < measures.length - 1 && (
                  <View style={{ width: 1, height: 28, backgroundColor: '#e5e7eb' }} />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
