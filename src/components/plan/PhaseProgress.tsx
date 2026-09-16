import { View, Text } from 'react-native'

const PHASES_ORDER = ['BASE', 'DESARROLLO', 'ESPECIFICO', 'AFINAMIENTO']

const PHASE_COLORS: Record<string, string> = {
  BASE: '#3b82f6',
  DESARROLLO: '#22c55e',
  ESPECIFICO: '#f97316',
  AFINAMIENTO: '#ef4444',
}

const PHASE_LABELS: Record<string, string> = {
  BASE: 'Base',
  DESARROLLO: 'Desarrollo',
  ESPECIFICO: 'Específico',
  AFINAMIENTO: 'Afinamiento',
}

const PHASE_LABELS_GYM: Record<string, string> = {
  BASE: 'Adaptación',
  DESARROLLO: 'Volumen',
  ESPECIFICO: 'Intensidad',
  AFINAMIENTO: 'Pico',
}

type PlanWeekForPhase = { weekNumber: number; phase: string }

type Props = {
  planPhases: string[]
  currentPhase: string
  currentWeekNum: number
  totalWeeks: number
  weeks: PlanWeekForPhase[]
  isGymPlan?: boolean
}

const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
}

export default function PhaseProgress({
  planPhases, currentPhase, currentWeekNum, totalWeeks, weeks, isGymPlan,
}: Props) {
  // Show only phases present in the plan (fallback to all 4 if empty)
  const display = planPhases.length > 0
    ? PHASES_ORDER.filter(p => planPhases.includes(p))
    : PHASES_ORDER
  const activeIdx = display.indexOf(currentPhase)
  const labels = isGymPlan ? PHASE_LABELS_GYM : PHASE_LABELS

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 14, ...SHADOW }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827' }}>
          Progreso del plan
        </Text>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
          Sem. {currentWeekNum}/{totalWeeks} · {Math.round((currentWeekNum / totalWeeks) * 100)}%
        </Text>
      </View>

      {/* Phase pills */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {display.map((phase, idx) => {
          const isActive = idx === activeIdx
          const isDone = idx < activeIdx
          const count = weeks.filter(w => w.phase === phase).length || 1
          const color = PHASE_COLORS[phase] ?? '#9ca3af'
          const fullLabel = labels[phase] ?? phase
          const shortLabel = fullLabel.length > 8 ? fullLabel.slice(0, 7) + '.' : fullLabel

          return (
            <View
              key={phase}
              style={{
                flex: count,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: isActive || isDone ? color : 'white',
                borderWidth: !isActive && !isDone ? 1 : 0,
                borderColor: '#e5e7eb',
                opacity: isDone ? 0.7 : 1,
              }}
            >
              <Text style={{
                fontSize: 11,
                fontFamily: 'Inter_600SemiBold',
                color: isActive || isDone ? 'white' : '#9ca3af',
              }}>
                {isDone ? '✓ ' : ''}{shortLabel}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
