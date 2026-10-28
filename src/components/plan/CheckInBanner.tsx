import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'

type Props = {
  recordedAt: string | null
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export default function CheckInBanner({ recordedAt }: Props) {
  const router = useRouter()

  const label = recordedAt
    ? (() => {
        const d = new Date(recordedAt + (recordedAt.includes('T') ? '' : 'T00:00:00'))
        return `Último check-in: ${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
      })()
    : 'Sin check-ins registrados · Haz tu primer check-in semanal'

  return (
    <TouchableOpacity
      onPress={() => router.push('/checkin' as never)}
      activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
    >
      <Text style={{ fontSize: 14 }}>📊</Text>
      <Text style={{
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: recordedAt ? '#9ca3af' : '#d1d5db',
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}
