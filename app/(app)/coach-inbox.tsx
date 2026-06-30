import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { getCoachAthletes, type CoachAthlete } from '../../src/api/coach'

const POLL_INTERVAL = 30_000

export default function CoachInboxScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [athletes, setAthletes] = useState<CoachAthlete[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    getCoachAthletes()
      .then(d => { setAthletes(d.athletes); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [load])

  function openChat(athlete: CoachAthlete) {
    router.push({ pathname: '/(app)/coach-chat', params: { athleteId: athlete.id, athleteName: athlete.name ?? athlete.email } } as any)
  }

  const initials = (name: string | null, email: string) => {
    const src = name ?? email
    return src.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#1e3a5f', paddingTop: insets.top + 8, paddingBottom: 16,
        paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: 'white' }}>Mensajes</Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_400Regular' }}>
            Conversaciones con atletas
          </Text>
        </View>
      </View>

      {/* Lista */}
      {!loaded ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#1e3a5f" />
        </View>
      ) : (
        <FlatList
          data={athletes}
          keyExtractor={a => a.id}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>👥</Text>
              <Text style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: '#111827', marginBottom: 6 }}>
                Sin atletas aún
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', fontFamily: 'Inter_400Regular', textAlign: 'center', paddingHorizontal: 32 }}>
                Tus atletas aparecerán aquí cuando los hayas incorporado.
              </Text>
            </View>
          }
          renderItem={({ item: athlete }) => (
            <TouchableOpacity
              onPress={() => openChat(athlete)}
              activeOpacity={0.7}
              style={{
                backgroundColor: 'white', borderRadius: 14, padding: 14,
                flexDirection: 'row', alignItems: 'center', gap: 12,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
              }}
            >
              {/* Avatar */}
              <View style={{
                width: 46, height: 46, borderRadius: 23,
                backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>
                  {initials(athlete.name, athlete.email)}
                </Text>
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                  {athlete.name ?? athlete.email}
                </Text>
                {athlete.name ? (
                  <Text style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'Inter_400Regular' }}>
                    {athlete.email}
                  </Text>
                ) : null}
              </View>

              {/* Badge no leídos */}
              {athlete.unread > 0 && (
                <View style={{
                  minWidth: 22, height: 22, borderRadius: 11,
                  backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center',
                  paddingHorizontal: 6,
                }}>
                  <Text style={{ color: 'white', fontSize: 11, fontFamily: 'Inter_700Bold' }}>
                    {athlete.unread > 99 ? '99+' : athlete.unread}
                  </Text>
                </View>
              )}

              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
