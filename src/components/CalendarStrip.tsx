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
  // Progress bar: count completed non-rest days for fill width
  const totalActive = days.filter(d => d.type && d.type !== 'DESCANSO').length
  const doneCount = days.filter(d => d.done && d.type && d.type !== 'DESCANSO').length
  const fillPct = totalActive > 0 ? (doneCount / totalActive) * 100 : 0

  return (
    <View style={{ backgroundColor: 'white' }}>
      {/* Continuous progress bar */}
      <View style={{ marginHorizontal: 16, marginTop: 8 }}>
        <View style={{ height: 2, backgroundColor: '#e5e7eb', borderRadius: 1 }}>
          <View style={{ height: 2, backgroundColor: '#22c35d', borderRadius: 1, width: `${fillPct}%` as any }} />
        </View>
      </View>

      {/* Day cells */}
      <View style={{ flexDirection: 'row', paddingTop: 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        {days.map(day => {
          const isSelected = day.dow === selectedDow
          const isRest = !day.type || day.type === 'DESCANSO'
          const isDone = day.done && !isRest

          // Letter color
          const letterColor = isDone
            ? '#22c35d'
            : day.isToday || isSelected
              ? '#1e3a5f'
              : '#8c9eb2'
          const letterWeight = day.isToday || isSelected ? 'Inter_700Bold' : 'Inter_500Medium'

          // Circle styles
          const circleColor = isDone
            ? '#22c35d'
            : day.isToday
              ? '#1e3a5f'
              : isSelected
                ? '#e5edf2'
                : '#e5edf2'
          const circleBorder = day.isToday && isSelected
            ? { borderWidth: 2, borderColor: '#f97316' }
            : {}

          // Number color
          const numColor = isDone || day.isToday ? 'white' : isSelected ? '#1e3a5f' : '#8c9eb2'
          const numWeight = day.isToday || isSelected ? 'Inter_700Bold' : 'Inter_400Regular'

          return (
            <TouchableOpacity
              key={day.dow}
              style={{ flex: 1, alignItems: 'center', gap: 4 }}
              onPress={() => { Haptics.selectionAsync(); onSelect(day.dow) }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: 10,
                fontFamily: letterWeight,
                color: letterColor,
              }}>
                {day.letter}
              </Text>
              <View style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: circleColor,
                alignItems: 'center', justifyContent: 'center',
                ...circleBorder,
              }}>
                {isDone ? (
                  <Text style={{ fontSize: 12, color: 'white', fontFamily: 'Inter_700Bold' }}>✓</Text>
                ) : (
                  <Text style={{
                    fontSize: 12,
                    fontFamily: numWeight,
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
