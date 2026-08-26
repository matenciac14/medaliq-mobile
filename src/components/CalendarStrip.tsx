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

export default function CalendarStrip({ days, selectedDow, onSelect, completedCount, totalTraining }: Props) {
  const pct = totalTraining > 0 ? completedCount / totalTraining : 0

  return (
    <View style={{ backgroundColor: 'white' }}>
      {/* Progress bar */}
      <View style={{ marginHorizontal: 16, marginTop: 14, height: 2, backgroundColor: '#e5e7eb', borderRadius: 1, overflow: 'hidden' }}>
        <View style={{ height: 2, width: `${pct * 100}%` as any, backgroundColor: '#22c55e', borderRadius: 1 }} />
      </View>

      {/* Day cells */}
      <View style={{ flexDirection: 'row', paddingTop: 8, paddingBottom: 16 }}>
        {days.map(day => {
          const isSelected = day.dow === selectedDow
          const isRest = !day.type || day.type === 'DESCANSO'
          const isSelectedNonToday = isSelected && !day.isToday
          const circleColor = day.done && !isRest
            ? '#22c55e'
            : day.isToday
              ? '#f97316'
              : isSelectedNonToday
                ? 'transparent'
                : day.canLog
                  ? '#fff7ed'
                  : 'transparent'
          const numColor = day.done || day.isToday
            ? 'white'
            : isSelectedNonToday ? '#1e3a5f'
            : day.canLog ? '#f97316' : '#6b7280'
          const letterBold = day.isToday || isSelected
          const hasBorder = day.canLog && !day.done && !day.isToday && !isSelectedNonToday
          const circleBorderWidth = day.isToday || isSelectedNonToday ? 2 : hasBorder ? 1.5 : 0
          const circleBorderColor = day.isToday && isSelected
            ? '#1e3a5f'
            : day.isToday
              ? 'rgba(249,115,22,0.35)'
              : isSelectedNonToday ? '#1e3a5f' : '#f97316'

          return (
            <TouchableOpacity
              key={day.dow}
              style={{ flex: 1, alignItems: 'center', gap: 4 }}
              onPress={() => { Haptics.selectionAsync(); onSelect(day.dow) }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: 10,
                fontFamily: letterBold ? 'Inter_700Bold' : 'Inter_500Medium',
                color: day.isToday ? '#f97316' : isSelected ? '#1e3a5f' : '#9ca3af',
              }}>
                {day.letter}
              </Text>
              <View style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: circleColor,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: circleBorderWidth,
                borderColor: circleBorderColor,
              }}>
                {day.done && !isRest ? (
                  <Text style={{ fontSize: 14, color: 'white' }}>✓</Text>
                ) : (
                  <Text style={{
                    fontSize: 13,
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

      <View style={{ height: 1, backgroundColor: '#e5e7eb' }} />
    </View>
  )
}
