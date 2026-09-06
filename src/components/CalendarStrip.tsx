import { View, Text, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'

export type DayCell = {
  dow: number
  letter: string
  dateNum: number
  type: string | null
  done: boolean
  isToday: boolean
  canLog: boolean
  gymLabel?: string | null
}

type Props = {
  days: DayCell[]
  selectedDow: number | null
  onSelect: (dow: number) => void
  completedCount?: number
  totalTraining?: number
}

export default function CalendarStrip({ days, selectedDow, onSelect }: Props) {
  return (
    <View style={{ backgroundColor: 'white' }}>
      {/* Segmented progress bar — one segment per day */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 3 }}>
        {days.map(day => {
          const isRest = !day.type || day.type === 'DESCANSO'
          const hasActivity = (!isRest) || !!day.gymLabel
          const activityDone = (day.done && !isRest) || (!!day.gymLabel && day.done)
          return (
            <View
              key={`seg-${day.dow}`}
              style={{
                flex: 1, height: 3, borderRadius: 99,
                backgroundColor: activityDone ? '#22c55e' : '#d1d5db',
              }}
            />
          )
        })}
      </View>

      {/* Day cells */}
      <View style={{ flexDirection: 'row', paddingTop: 8, paddingBottom: 12 }}>
        {days.map(day => {
          const isSelected = day.dow === selectedDow
          const isRest = !day.type || day.type === 'DESCANSO'
          const isDone = day.done && !isRest
          const hasSession = !!day.type && day.type !== 'DESCANSO'
          const hasGym = !!day.gymLabel && !hasSession

          // Circle bg — matches web MobileDayPills
          const hasActivity = hasSession || hasGym
          const activityDone = isDone || (hasGym && day.done)
          const circleColor = day.isToday
            ? '#ea580c'
            : activityDone
              ? '#22c55e'
              : isSelected
                ? 'white'
                : hasActivity
                  ? '#1e3a5f'
                  : '#f1f5f9'

          // Circle border — matches web
          const circleBorder = isSelected && !day.isToday && !activityDone
            ? { borderWidth: 2, borderColor: '#1e3a5f' }
            : !hasActivity && !day.isToday && !activityDone
              ? { borderWidth: 1, borderColor: '#cbd5e1' }
              : {}

          // Number color
          const numColor = day.isToday || activityDone || (hasActivity && !isSelected)
            ? 'white'
            : isSelected
              ? '#1e3a5f'
              : '#9ca3af'

          // Letter color
          const letterColor = day.isToday
            ? '#ea580c'
            : isSelected
              ? '#1e3a5f'
              : '#9ca3af'

          return (
            <TouchableOpacity
              key={day.dow}
              style={{ flex: 1, alignItems: 'center', gap: 4 }}
              onPress={() => { Haptics.selectionAsync(); onSelect(day.dow) }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: 11,
                fontFamily: 'Inter_600SemiBold',
                color: letterColor,
              }}>
                {day.letter}
              </Text>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: circleColor,
                alignItems: 'center', justifyContent: 'center',
                ...circleBorder,
              }}>
                <Text style={{
                    fontSize: 15,
                    fontFamily: day.isToday || isSelected || activityDone ? 'Inter_700Bold' : 'Inter_400Regular',
                    color: numColor,
                  }}>
                    {activityDone && !day.isToday ? '✓' : day.dateNum}
                  </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
