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
}

type Props = {
  days: DayCell[]
  selectedDow: number | null
  onSelect: (dow: number) => void
  completedCount: number
  totalTraining: number
}

export default function CalendarStrip({ days, selectedDow, onSelect }: Props) {
  return (
    <View style={{ backgroundColor: 'white' }}>
      {/* Segmented progress bar — one segment per day */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 3 }}>
        {days.map(day => {
          const isRest = !day.type || day.type === 'DESCANSO'
          const isDone = day.done && !isRest
          return (
            <View
              key={`seg-${day.dow}`}
              style={{
                flex: 1, height: 3, borderRadius: 1.5,
                backgroundColor: isDone ? '#22c55e' : '#e5e7eb',
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

          // Circle bg
          const circleColor = day.isToday
            ? '#ea580c'
            : isDone
              ? '#22c55e'
              : isSelected
                ? 'white'
                : hasSession
                  ? '#1e3a5f'
                  : 'white'

          // Circle border
          const circleBorder = isSelected && !day.isToday && !isDone
            ? { borderWidth: 2, borderColor: '#1e3a5f' }
            : !hasSession && !day.isToday && !isDone
              ? { borderWidth: 1, borderColor: '#e5e7eb' }
              : {}

          // Number color
          const numColor = day.isToday || isDone || hasSession
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
                fontFamily: day.isToday || isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium',
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
                {isDone && !day.isToday ? (
                  <Text style={{ fontSize: 15, color: 'white', fontFamily: 'Inter_700Bold' }}>✓</Text>
                ) : (
                  <Text style={{
                    fontSize: 15,
                    fontFamily: day.isToday || isSelected ? 'Inter_700Bold' : 'Inter_400Regular',
                    color: numColor,
                  }}>
                    {day.dateNum}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
