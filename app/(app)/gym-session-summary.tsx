import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Share } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { getGymSessionSummary } from '../../src/api/gym'

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${kg.toLocaleString('es-CO')} kg`
}

export default function GymSessionSummaryScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['gym-session-summary', sessionId],
    queryFn: () => getGymSessionSummary(sessionId),
    enabled: !!sessionId,
    staleTime: Infinity,
  })

  async function handleShare() {
    if (!data) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const lines: string[] = []
    lines.push('Sesion de gym completada en Medaliq')
    if (data.workoutName) lines.push(`Entrenamiento: ${data.workoutName}`)
    if (data.planContext) lines.push(`Plan: ${data.planContext}`)
    lines.push('')
    lines.push(`Duracion: ${formatDuration(data.durationMin)}`)
    lines.push(`Volumen total: ${formatVolume(data.totalVolume)}`)
    lines.push(`Series: ${data.totalSets}  |  Ejercicios: ${data.totalExercises}`)
    if (data.caloriesBurned > 0) {
      lines.push(`Calorias quemadas: ${data.caloriesBurned} kcal${data.caloriesEstimated ? ' (estimado)' : ''}`)
    }
    if (data.newPRs.length > 0) {
      lines.push('')
      lines.push(`Records personales (${data.newPRs.length}):`)
      for (const pr of data.newPRs) {
        lines.push(`  - ${pr.exerciseName}: ${pr.value} ${pr.unit}`)
      }
    }
    await Share.share({ message: lines.join('\n') })
  }

  function handleClose() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.replace('/(app)/(tabs)/gym')
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#1e3a5f" />
        <Text style={{ marginTop: 12, fontSize: 14, color: '#6b7280', fontFamily: 'Inter_400Regular' }}>
          Cargando resumen...
        </Text>
      </View>
    )
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, paddingHorizontal: 24 }}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={{ marginTop: 12, fontSize: 16, color: '#374151', fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>
          No se pudo cargar el resumen
        </Text>
        <TouchableOpacity
          onPress={handleClose}
          style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: '#1e3a5f', borderRadius: 12 }}
        >
          <Text style={{ color: 'white', fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View
          style={{
            backgroundColor: '#1e3a5f',
            paddingTop: insets.top + 24,
            paddingBottom: 32,
            paddingHorizontal: 24,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
          </View>
          <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: 'white', textAlign: 'center' }}>
            Sesion Completada
          </Text>
          {data.workoutName && (
            <Text style={{ marginTop: 6, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#93c5fd', textAlign: 'center' }}>
              {data.workoutName}
            </Text>
          )}
          {data.planContext && (
            <View
              style={{
                marginTop: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: 'rgba(249, 115, 22, 0.2)',
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#fdba74' }}>
                {data.planContext}
              </Text>
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 16 }}>

          {/* ── Stats Grid ── */}
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              overflow: 'hidden',
            }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[
                { label: 'Duracion', value: formatDuration(data.durationMin), icon: 'time-outline' },
                { label: 'Volumen total', value: formatVolume(data.totalVolume), icon: 'barbell-outline' },
                { label: 'Series', value: String(data.totalSets), icon: 'repeat-outline' },
                { label: 'Ejercicios', value: String(data.totalExercises), icon: 'list-outline' },
              ].map((stat, idx) => (
                <View
                  key={stat.label}
                  style={{
                    width: '50%',
                    paddingVertical: 20,
                    paddingHorizontal: 16,
                    alignItems: 'center',
                    borderRightWidth: idx % 2 === 0 ? 1 : 0,
                    borderBottomWidth: idx < 2 ? 1 : 0,
                    borderColor: '#f3f4f6',
                  }}
                >
                  <Ionicons name={stat.icon as any} size={20} color="#6b7280" />
                  <Text style={{ marginTop: 6, fontSize: 22, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                    {stat.value}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 2 }}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Calories ── */}
          {data.caloriesBurned > 0 && (
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#fff7ed',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="flame-outline" size={22} color="#f97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                  {data.caloriesBurned} kcal
                </Text>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 2 }}>
                  Calorias quemadas{data.caloriesEstimated ? ' (estimado)' : ''}
                </Text>
              </View>
            </View>
          )}

          {/* ── New PRs ── */}
          {data.newPRs.length > 0 && (
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                padding: 20,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Ionicons name="trophy-outline" size={20} color="#f97316" />
                <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                  Records Personales
                </Text>
                <View
                  style={{
                    marginLeft: 'auto',
                    backgroundColor: '#f97316',
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: 'white' }}>
                    {data.newPRs.length}
                  </Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                {data.newPRs.map((pr, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#fff7ed',
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      gap: 10,
                    }}
                  >
                    <Ionicons name="star" size={16} color="#f97316" />
                    <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>
                      {pr.exerciseName}
                    </Text>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#f97316' }}>
                      {pr.value} {pr.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Muscles Worked ── */}
          {data.musclesWorked.length > 0 && (
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                padding: 20,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Ionicons name="body-outline" size={20} color="#1e3a5f" />
                <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827' }}>
                  Musculos trabajados
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {data.musclesWorked.map((m, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#f0f4ff',
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>
                      {m.name}
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#1e3a5f',
                        borderRadius: 8,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: 'white' }}>
                        {m.sets}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      {/* ── Bottom Buttons ── */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 12,
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={handleShare}
          activeOpacity={0.7}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: '#1e3a5f',
            backgroundColor: 'white',
          }}
        >
          <Ionicons name="share-outline" size={18} color="#1e3a5f" />
          <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>
            Compartir
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.7}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: '#1e3a5f',
          }}
        >
          <Ionicons name="checkmark-done-outline" size={18} color="white" />
          <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
            Cerrar
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
