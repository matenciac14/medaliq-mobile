import { View, Text } from 'react-native'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

type DayStatus = 'done' | 'missed' | 'rest' | 'future' | 'today' | 'gym_done' | 'gym_pending'

type GymDay = { dow: number; done: boolean }

type Props = {
  weekSessions: { dayOfWeek: number; type: string; completed: boolean }[]
  todayDow: number
  isCurrentWeek: boolean
  gymDays?: GymDay[]
}

const STATUS_COLORS: Record<DayStatus, string> = {
  done: '#22c55e',
  missed: '#ef4444',
  rest: '#e5e7eb',
  future: '#f3f4f6',
  today: '#f97316',
  gym_done: '#8b5cf6',
  gym_pending: '#ede9fe',
}

const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
}

export default function AdherenceCompact({ weekSessions, todayDow, isCurrentWeek, gymDays = [] }: Props) {
  const planDows = new Set(weekSessions.filter(s => s.type !== 'DESCANSO').map(s => s.dayOfWeek))

  const days = Array.from({ length: 7 }, (_, i) => {
    const dow = i + 1
    const session = weekSessions.find(s => s.dayOfWeek === dow)
    const gym = !planDows.has(dow) ? gymDays.find(g => g.dow === dow) : undefined
    const isRest = !session && !gym || (session && session.type === 'DESCANSO' && !gym)
    const isFuture = isCurrentWeek && dow > todayDow
    const isToday = isCurrentWeek && dow === todayDow

    let status: DayStatus
    if (isFuture) {
      status = 'future'
    } else if (isRest) {
      status = 'rest'
    } else if (session && session.type !== 'DESCANSO') {
      if (isToday && !session.completed) status = 'today'
      else if (session.completed) status = 'done'
      else status = 'missed'
    } else if (gym) {
      status = gym.done ? 'gym_done' : (isToday ? 'today' : 'gym_pending')
    } else {
      status = 'rest'
    }

    return { dow, label: DAY_LABELS[i], status }
  })

  const completedDays = days.filter(d => d.status === 'done' || d.status === 'gym_done').length
  const trainingDays = days.filter(d => !['rest', 'future'].includes(d.status)).length
  const pct = trainingDays > 0 ? Math.round((completedDays / trainingDays) * 100) : 0
  const hasData = trainingDays > 0

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', padding: 14, ...SHADOW }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827' }}>
          Adherencia semanal
        </Text>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
          {hasData ? `${pct}%` : 'Sin datos'}
        </Text>
      </View>

      {/* Day blocks */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {days.map(({ dow, label, status }) => (
          <View key={dow} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View style={{
              width: '100%',
              height: 22,
              borderRadius: 6,
              backgroundColor: STATUS_COLORS[status],
            }} />
            <Text style={{
              fontSize: 10,
              fontFamily: 'Inter_500Medium',
              color: status === 'done' ? '#16a34a'
                : status === 'gym_done' ? '#7c3aed'
                : status === 'today' ? '#ea580c'
                : '#9ca3af',
            }}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
