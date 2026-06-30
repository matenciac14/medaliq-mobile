import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { getGymHistory, type GymSessionSummary } from '../../src/api/gym-history'

function rpeStyle(rpe: number | null): { bg: string; text: string } {
  if (!rpe) return { bg: '#f3f4f6', text: '#6b7280' }
  if (rpe <= 4) return { bg: '#dbeafe', text: '#1d4ed8' }
  if (rpe <= 6) return { bg: '#fef9c3', text: '#ca8a04' }
  if (rpe <= 8) return { bg: '#ffedd5', text: '#c2410c' }
  return { bg: '#fee2e2', text: '#dc2626' }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatVolume(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg}kg`
}

function SessionCard({ session }: { session: GymSessionSummary }) {
  const [expanded, setExpanded] = useState(false)
  const rpe = rpeStyle(session.rpe)
  const canExpand = !session.isFree || !!session.notes

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: session.isFree ? '#ede9fe' : '#e5e7eb', overflow: 'hidden', marginBottom: 10 }}>
      <TouchableOpacity
        onPress={() => canExpand && setExpanded(e => !e)}
        activeOpacity={canExpand ? 0.8 : 1}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}
      >
        {/* Status / icon */}
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: session.isFree ? '#ede9fe' : (session.completed ? '#dcfce7' : '#f3f4f6') }}>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: session.isFree ? '#7c3aed' : (session.completed ? '#16a34a' : '#9ca3af') }}>
            {session.isFree ? '💪' : (session.completed ? '✓' : '○')}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{session.label}</Text>
            {session.isFree && (
              <View style={{ backgroundColor: '#ede9fe', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#7c3aed' }}>LIBRE</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 2 }}>
            {formatDate(session.date)}
          </Text>
          {session.muscleGroups.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {session.muscleGroups.map(mg => (
                <View key={mg} style={{ backgroundColor: '#1e3a5f14', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_500Medium', color: '#1e3a5f' }}>{mg}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Right stats */}
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {session.durationMin && (
            <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>{session.durationMin}min</Text>
          )}
          {session.rpe && (
            <View style={{ backgroundColor: rpe.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: rpe.text }}>RPE {session.rpe}</Text>
            </View>
          )}
          {session.volumeKg > 0 && (
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#f97316' }}>
              ⚡ {formatVolume(session.volumeKg)}
            </Text>
          )}
          {canExpand && (
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
              {expanded ? '▲' : '▼'}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded: exercises */}
      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', padding: 16, gap: 12 }}>
          {session.notes && (
            <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280', fontStyle: 'italic', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 10 }}>
              {session.notes}
            </Text>
          )}
          {session.exercises.map(ex => (
            <View key={ex.name}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f', marginBottom: 6 }}>
                🏋 {ex.name}
              </Text>
              <View style={{ gap: 4 }}>
                {ex.sets.map(s => (
                  <View
                    key={s.setNumber}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      backgroundColor: s.completed ? '#f0fdf4' : '#f8fafc',
                      borderWidth: 1, borderColor: s.completed ? '#bbf7d0' : '#f3f4f6',
                      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
                    }}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: s.completed ? '#22c55e' : '#d1d5db' }}>
                      <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: 'white' }}>{s.setNumber}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                      {s.weightKg != null ? `${s.weightKg} kg` : '—'}
                    </Text>
                    <Text style={{ color: '#9ca3af' }}>×</Text>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                      {s.repsCompleted != null ? `${s.repsCompleted} reps` : '—'}
                    </Text>
                    {s.isPR && (
                      <View style={{ backgroundColor: '#f97316', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 'auto' }}>
                        <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: 'white', letterSpacing: 0.5 }}>🏆 PR</Text>
                      </View>
                    )}
                    {!s.isPR && s.completed && <Text style={{ marginLeft: 'auto', color: '#22c55e', fontSize: 13 }}>✓</Text>}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export default function GymHistoryScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data, isLoading } = useQuery({ queryKey: ['gym-history'], queryFn: getGymHistory })

  const GradientHeader = () => (
    <LinearGradient
      colors={['#1e3a5f', '#2d5a8e']}
      style={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 16, gap: 12 }}
    >
      <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', padding: 4 }}>
        <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
      <View>
        <Text style={{ color: 'white', fontSize: 22, fontFamily: 'Inter_900Black', letterSpacing: -0.5 }}>Historial Gym</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>Tus sesiones anteriores</Text>
      </View>
    </LinearGradient>
  )

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
        <GradientHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      </View>
    )
  }

  const stats = data?.stats

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <GradientHeader />
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, paddingHorizontal: 20, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >

      {/* Stats */}
      {stats && stats.total > 0 && (
        <View style={{ backgroundColor: '#1e3a5f0f', borderWidth: 1, borderColor: '#1e3a5f26', borderRadius: 16, padding: 16, flexDirection: 'row' }}>
          {[
            { v: String(stats.total), l: 'Sesiones' },
            { v: String(stats.completed), l: 'Completadas' },
            { v: String(stats.totalSets), l: 'Series' },
            { v: formatVolume(stats.totalVolumeKg), l: 'Volumen' },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              {i > 0 && <View style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 1, backgroundColor: '#1e3a5f33' }} />}
              <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: i === 3 ? '#f97316' : '#1e3a5f' }}>{s.v}</Text>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 2 }}>{s.l}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Session list */}
      {!data?.sessions.length ? (
        <View style={{ alignItems: 'center', marginTop: 60, gap: 12 }}>
          <Text style={{ fontSize: 48 }}>🏋️</Text>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1e3a5f', textAlign: 'center' }}>
            Sin sesiones registradas
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>
            Tus sesiones aparecerán aquí una vez que las completes
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(app)/gym-session')}
            style={{ backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 }}
          >
            <Text style={{ color: 'white', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Comenzar sesión →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {data.sessions.map(s => <SessionCard key={s.id} session={s} />)}
        </View>
      )}
    </ScrollView>
    </View>
  )
}
