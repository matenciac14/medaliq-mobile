import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { getWeeklyRecap } from '../../src/api/progress'

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()}–${e.getDate()} ${months[e.getMonth()]}`
  }
  return `${s.getDate()} ${months[s.getMonth()]} – ${e.getDate()} ${months[e.getMonth()]}`
}

function ChangeRow({ label, value, unit = '' }: { label: string; value: number | null; unit?: string }) {
  if (value == null) return null
  const positive = value >= 0
  const color = value === 0 ? '#6b7280' : positive ? '#16a34a' : '#dc2626'
  const prefix = value > 0 ? '+' : ''
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
      <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {value !== 0 && (
          <Ionicons
            name={positive ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={color}
          />
        )}
        <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color }}>
          {prefix}{unit === 'kcal' || unit === 'kg' ? value.toLocaleString() : value}{unit ? ` ${unit}` : ''}
        </Text>
      </View>
    </View>
  )
}

export default function WeeklyRecapScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [week, setWeek] = useState<'current' | 'previous'>('previous')

  const { data, isLoading } = useQuery({
    queryKey: ['weekly-recap', week],
    queryFn: () => getWeeklyRecap(week),
  })

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 12,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: '#1e3a5f',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: 'white' }}>
            Tu Semana
          </Text>
          {data && (
            <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
              {formatWeekRange(data.weekStart, data.weekEnd)}
            </Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Toggle */}
      <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 14, backgroundColor: 'white', borderRadius: 12, padding: 3, ...SHADOW }}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setWeek('current') }}
          activeOpacity={0.8}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: week === 'current' ? '#1e3a5f' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: week === 'current' ? 'white' : '#6b7280' }}>
            Esta semana
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setWeek('previous') }}
          activeOpacity={0.8}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: week === 'previous' ? '#1e3a5f' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: week === 'previous' ? 'white' : '#6b7280' }}>
            Semana anterior
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading || !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 32, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Streak badge */}
          {data.currentStreak > 0 && (
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff7ed', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#fed7aa' }}>
              <Text style={{ fontSize: 16 }}>🔥</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#ea580c' }}>
                {data.currentStreak} {data.currentStreak === 1 ? 'día' : 'días'} de racha
              </Text>
            </View>
          )}

          {/* Stats grid */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Sessions */}
              <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, alignItems: 'center', gap: 4, ...SHADOW }}>
                <Text style={{ fontSize: 36, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
                  {data.sessionsCompleted}
                </Text>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
                  Sesiones
                </Text>
              </View>

              {/* Duration */}
              <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, alignItems: 'center', gap: 4, ...SHADOW }}>
                <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
                  {formatDuration(data.totalDurationMin)}
                </Text>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
                  Tiempo total
                </Text>
              </View>
            </View>

            {/* Volume */}
            {data.totalVolume != null && (
              <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SHADOW }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Volumen total
                </Text>
                <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>
                  {data.totalVolume.toLocaleString()} kg
                </Text>
              </View>
            )}
          </View>

          {/* PRs */}
          {data.newPRs.length > 0 && (
            <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, gap: 10, ...SHADOW }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Nuevos PRs
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {data.newPRs.map((pr, i) => (
                  <View
                    key={i}
                    style={{ backgroundColor: '#fff7ed', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#fed7aa', flexDirection: 'row', alignItems: 'center', gap: 5 }}
                  >
                    <Text style={{ fontSize: 12 }}>🏆</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#ea580c' }}>
                      {pr.exerciseName}
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#c2410c' }}>
                      {pr.value.toLocaleString()} {pr.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Nutrition summary */}
          {(data.avgKcal != null || data.avgProteinG != null) && (
            <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, gap: 12, ...SHADOW }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Nutricion
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {data.avgKcal != null && (
                  <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, paddingVertical: 12, gap: 2 }}>
                    <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>
                      {Math.round(data.avgKcal).toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      kcal/día
                    </Text>
                  </View>
                )}
                {data.avgProteinG != null && (
                  <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, paddingVertical: 12, gap: 2 }}>
                    <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>
                      {Math.round(data.avgProteinG)}g
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      prot/día
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, paddingVertical: 12, gap: 2 }}>
                  <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>
                    {data.daysLogged}
                  </Text>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    días log
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Weight */}
          {(data.weightStart != null || data.weightEnd != null) && (
            <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, gap: 12, ...SHADOW }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Peso
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {data.weightStart != null && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginBottom: 2 }}>Inicio</Text>
                    <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: '#374151' }}>
                      {data.weightStart} kg
                    </Text>
                  </View>
                )}
                {data.weightStart != null && data.weightEnd != null && (
                  <Ionicons name="arrow-forward" size={16} color="#9ca3af" style={{ flex: 1, textAlign: 'center' } as any} />
                )}
                {data.weightEnd != null && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginBottom: 2 }}>Fin</Text>
                    <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: '#374151' }}>
                      {data.weightEnd} kg
                    </Text>
                  </View>
                )}
                {data.weightChange != null && (
                  <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginBottom: 2 }}>Cambio</Text>
                    <Text style={{
                      fontSize: 18,
                      fontFamily: 'Inter_700Bold',
                      color: data.weightChange === 0 ? '#6b7280' : data.weightChange < 0 ? '#16a34a' : '#dc2626',
                    }}>
                      {data.weightChange > 0 ? '+' : ''}{data.weightChange} kg
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Comparison vs previous week */}
          {data.comparison != null && (
            <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, gap: 10, ...SHADOW }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                vs semana anterior
              </Text>
              <ChangeRow label="Sesiones" value={data.comparison.sessionsChange} />
              <ChangeRow label="Kcal promedio" value={data.comparison.avgKcalChange != null ? Math.round(data.comparison.avgKcalChange) : null} unit="kcal" />
              <ChangeRow label="Volumen" value={data.comparison.volumeChange != null ? Math.round(data.comparison.volumeChange) : null} unit="kg" />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}
