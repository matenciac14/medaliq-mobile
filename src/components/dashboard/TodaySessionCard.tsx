import { View, Text, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import type { Router } from 'expo-router'

import { SESSION_ICONS, SESSION_LABELS } from '../../constants/sessions'

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

type TodaySession = {
  id: string
  type: string
  durationMin: number | null
  zoneTarget: string | null
  completed: boolean
  detailText?: string | null
  logId?: string | null
}

type Props = {
  todaySession: TodaySession
  workoutName: string | null | undefined
  router: Router
}

export default function TodaySessionCard({ todaySession, workoutName, router }: Props) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#1e3a5f' }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#ea580c', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {'\u25CF'} HOY
          </Text>
          {todaySession.completed ? (
            <View style={{ backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'white' }}>Completada</Text>
            </View>
          ) : todaySession.zoneTarget && todaySession.zoneTarget !== 'N/A' ? (
            <View style={{ backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#15803d' }}>
                Zona {todaySession.zoneTarget}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 28 }}>{todaySession.completed ? '\u2713' : (SESSION_ICONS[todaySession.type] ?? '\uD83C\uDFC5')}</Text>
          <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
            {todaySession.id === 'gym-today' && workoutName
              ? workoutName
              : `${todaySession.durationMin ?? '\u2014'} min`}
          </Text>
        </View>
        <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
          {SESSION_LABELS[todaySession.type] ?? todaySession.type.toLowerCase().replace(/_/g, ' ')}
        </Text>
        {todaySession.detailText ? (
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
            {todaySession.detailText}
          </Text>
        ) : null}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            if (todaySession.completed) {
              router.push(todaySession.id === 'gym-today' ? '/(app)/(tabs)/gym' : '/(app)/(tabs)/progress' as any)
            } else if (todaySession.id === 'gym-today') {
              router.push('/(app)/(tabs)/gym')
            } else {
              router.push({
                pathname: '/(app)/log',
                params: {
                  sessionId: todaySession.id,
                  type: todaySession.type,
                  duration: String(todaySession.durationMin),
                  zone: todaySession.zoneTarget,
                },
              })
            }
          }}
          activeOpacity={0.85}
          style={{ backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 }}
        >
          <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_700Bold' }}>
            {todaySession.completed ? 'Ver resumen \u2192' : todaySession.id === 'gym-today' ? 'Ir al Entreno \u2192' : 'Iniciar \u2192'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(app)/(tabs)/progress' as any) }}
          activeOpacity={0.7}
          style={{ alignItems: 'center', marginTop: 2 }}
        >
          <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#ea580c' }}>
            + Agregar otra actividad
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
