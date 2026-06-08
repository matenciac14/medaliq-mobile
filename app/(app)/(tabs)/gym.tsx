import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { getTodayGymSession } from '../../../src/api/gym'

export default function GymScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const { data: session, isLoading, refetch } = useQuery({
    queryKey: ['gym-today'],
    queryFn: getTodayGymSession,
  })

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  if (!session || !session.workoutDay) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>😴</Text>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1e3a5f', textAlign: 'center' }}>
          Descanso hoy
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280', fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8 }}>
          No hay sesión de gym programada para hoy.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: 16, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.5 }}>
        Gym
      </Text>

      {/* Workout card */}
      <View style={{ borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}>
        <LinearGradient colors={['#1e3a5f', '#2d5a8e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ padding: 20 }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Sesión de hoy
          </Text>
          <Text style={{ color: 'white', fontSize: 22, fontFamily: 'Inter_900Black', letterSpacing: -0.5 }}>
            {session.workoutDay.label}
          </Text>
          {session.workoutDay.muscleGroups.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {session.workoutDay.muscleGroups.map((mg) => (
                <View key={mg} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: 'white', fontSize: 11, fontFamily: 'Inter_500Medium' }}>{mg}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8 }}>
            {session.exercises.length} ejercicios
          </Text>
        </LinearGradient>

        <View style={{ backgroundColor: 'white', padding: 16 }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
              router.push('/(app)/gym-session')
            }}
            activeOpacity={0.85}
            style={{ backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Comenzar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ejercicios preview */}
      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Ejercicios
      </Text>
      {session.exercises.map((ex, i) => {
        const prev = ex.previousLogs.find((l) => l.setNumber === 1)
        return (
          <View key={ex.id} style={{ backgroundColor: 'white', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{ex.exercise.name}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                {ex.sets} series · {ex.repsScheme}
                {prev?.weightKg ? ` · prev: ${prev.weightKg}kg` : ''}
              </Text>
            </View>
          </View>
        )
      })}
    </ScrollView>
  )
}
