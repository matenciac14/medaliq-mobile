import { View, Text, TouchableOpacity } from 'react-native'
import { SESSION_ICONS, SESSION_LABELS } from '../constants/sessions'

type SessionInfo = {
  type: string | null
  done: boolean
  isToday: boolean
  id: string | null
  durationMin: number | null
  zoneTarget: string | null
  gymLabel?: string | null
}

type Props = {
  session: SessionInfo | null
  isToday: boolean
  dayLabel: string
  onLog: () => void
  onViewPlan: () => void
}

const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
}

export default function SelectedDayCard({ session, isToday, dayLabel, onLog, onViewPlan }: Props) {
  const isRest = session?.type === 'DESCANSO'
  const hasSession = !!session?.type && session.type !== 'DESCANSO'

  // Rest day
  if (isRest) {
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOW }}>
        <Text style={{ fontSize: 28 }}>😴</Text>
        <View>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>Día de descanso</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>Recupera bien hoy</Text>
        </View>
      </View>
    )
  }

  // No session
  if (!hasSession) {
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
        <View style={{ height: 3, backgroundColor: '#ea580c' }} />
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 6 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#ea580c', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {isToday ? '● HOY' : `● ${dayLabel}`}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28 }}>🎯</Text>
            <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -0.5 }}>Sin sesión</Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>Sin sesión planificada</Text>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>Registra tu entrenamiento</Text>
          <TouchableOpacity onPress={onLog} activeOpacity={0.85} style={{ marginTop: 4, backgroundColor: '#ea580c', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'white' }}>Registrar actividad →</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Has session
  const emoji = SESSION_ICONS[session!.type!] ?? '🏃'
  const isGym = session!.type === 'FUERZA'
  const sessionName = isGym && session!.gymLabel
    ? session!.gymLabel
    : (SESSION_LABELS[session!.type!] ?? session!.type!.replace(/_/g, ' '))
  const durationMin = session!.durationMin ?? 0
  const zone = session!.zoneTarget
  const done = session!.done

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#22c55e' }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 6 }}>
        {/* Day label + status badge */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#ea580c', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {isToday ? '● HOY' : `● ${dayLabel}`}
          </Text>
          {done ? (
            <View style={{ backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'white' }}>Completada</Text>
            </View>
          ) : zone && zone !== 'N/A' && zone !== '—' ? (
            <View style={{ backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#16a34a' }}>Zona {zone}</Text>
            </View>
          ) : null}
        </View>

        {/* Emoji + duration/name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 28 }}>{done ? '✓' : emoji}</Text>
          <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -0.5 }}>
            {durationMin > 0 ? `${durationMin} min` : sessionName}
          </Text>
        </View>

        <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{sessionName}</Text>

        {/* Pills */}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          {durationMin > 0 && (
            <View style={{ backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#4b5563' }}>{durationMin} min</Text>
            </View>
          )}
          {zone && zone !== 'N/A' && zone !== '—' && (
            <View style={{ backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#dbeafe' }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#1d4ed8' }}>Zona {zone}</Text>
            </View>
          )}
          <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#dcfce7' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#16a34a' }}>{isGym ? 'Gym' : (SESSION_LABELS[session!.type!] ?? 'Running')}</Text>
          </View>
        </View>

        {/* CTA */}
        <View style={{ marginTop: 4 }}>
          {done ? (
            <TouchableOpacity onPress={onViewPlan} activeOpacity={0.85} style={{ backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'white' }}>Ver resumen →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onLog} activeOpacity={0.85} style={{ backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'white' }}>{isGym ? 'Ir al Gym →' : 'Iniciar →'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}
