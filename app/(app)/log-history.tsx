import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { apiFetch } from '../../src/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type RunEntry = {
  kind: 'run'
  id: string
  date: string
  sessionType: string
  durationMin: number | null
  distanceKm: number | null
  rpe: number | null
  hrAvg: number | null
  notes: string | null
}

type GymEntry = {
  kind: 'gym'
  id: string
  date: string
  templateName: string | null
  exercises: string[]
  durationMin: number | null
  rpe: number | null
  notes: string | null
}

type FeedEntry = RunEntry | GymEntry

const RUN_META: Record<string, { label: string; color: string; emoji: string }> = {
  RODAJE_Z2:    { label: 'Rodaje Z2',    color: '#22c55e', emoji: '🟢' },
  FARTLEK:      { label: 'Fartlek',      color: '#eab308', emoji: '🟡' },
  TEMPO:        { label: 'Tempo',        color: '#f97316', emoji: '🟠' },
  INTERVALOS:   { label: 'Intervalos',   color: '#ef4444', emoji: '🔴' },
  TIRADA_LARGA: { label: 'Tirada larga', color: '#3b82f6', emoji: '🔵' },
  OTRO:         { label: 'Sesión libre', color: '#9ca3af', emoji: '⚪' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatDuration(min: number | null) {
  if (!min) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function RunCard({ entry }: { entry: RunEntry }) {
  const meta = RUN_META[entry.sessionType] ?? RUN_META.OTRO
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{meta.label}</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{formatDate(entry.date)}</Text>
        </View>
        {entry.rpe != null && (
          <View style={{ backgroundColor: entry.rpe >= 8 ? '#fee2e2' : entry.rpe >= 6 ? '#fef3c7' : '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: entry.rpe >= 8 ? '#dc2626' : entry.rpe >= 6 ? '#d97706' : '#16a34a' }}>RPE {entry.rpe}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {entry.distanceKm != null && (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>{entry.distanceKm.toFixed(1)}</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>km</Text>
          </View>
        )}
        {entry.durationMin != null && (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>{formatDuration(entry.durationMin)}</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>duración</Text>
          </View>
        )}
        {entry.hrAvg != null && (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#ef4444' }}>{entry.hrAvg}</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>bpm prom</Text>
          </View>
        )}
      </View>
      {entry.notes ? (
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280', fontStyle: 'italic' }} numberOfLines={2}>{entry.notes}</Text>
      ) : null}
    </View>
  )
}

function GymCard({ entry }: { entry: GymEntry }) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 20 }}>🏋️</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#111827' }}>{entry.templateName ?? 'Sesión de gym'}</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>{formatDate(entry.date)}</Text>
        </View>
        {entry.rpe != null && (
          <View style={{ backgroundColor: entry.rpe >= 8 ? '#fee2e2' : entry.rpe >= 6 ? '#fef3c7' : '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: entry.rpe >= 8 ? '#dc2626' : entry.rpe >= 6 ? '#d97706' : '#16a34a' }}>RPE {entry.rpe}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {entry.durationMin != null && (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>{formatDuration(entry.durationMin)}</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>duración</Text>
          </View>
        )}
      </View>
      {entry.exercises.length > 0 && (
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>
          {entry.exercises.slice(0, 3).join(' · ')}{entry.exercises.length > 3 ? ` +${entry.exercises.length - 3}` : ''}
        </Text>
      )}
      {entry.notes ? (
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280', fontStyle: 'italic' }} numberOfLines={2}>{entry.notes}</Text>
      ) : null}
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LogHistoryScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const { data, isLoading } = useQuery({
    queryKey: ['log-history'],
    queryFn: () => apiFetch<{ sessions: FeedEntry[] }>('/api/mobile/log/history'),
  })

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1e3a5f', paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: 'white', flex: 1 }}>Historial de sesiones</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      ) : !data?.sessions?.length ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 }}>
          <Text style={{ fontSize: 40 }}>📋</Text>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#374151', textAlign: 'center' }}>Sin sesiones registradas</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9ca3af', textAlign: 'center' }}>Tus sesiones de running y gym aparecerán aquí.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            Últimas {data.sessions.length} sesiones
          </Text>
          {data.sessions.map(entry =>
            entry.kind === 'run'
              ? <RunCard key={entry.id} entry={entry} />
              : <GymCard key={entry.id} entry={entry} />
          )}
        </ScrollView>
      )}
    </View>
  )
}
