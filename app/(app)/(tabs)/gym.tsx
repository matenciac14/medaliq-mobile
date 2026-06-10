import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { getTodayGymSession, getPublicTemplates, assignTemplate, type PublicTemplate } from '../../../src/api/gym'
import { useAuthStore } from '../../../src/store/auth'
import UpgradeWall from '../../../src/components/UpgradeWall'

const CATEGORY_ICONS: Record<string, string> = {
  PPL: '🔄', FULL_BODY: '💪', UPPER_LOWER: '↕️', STRENGTH: '🏋️', BEGINNER: '🌱',
}
const GOAL_LABELS: Record<string, string> = {
  HYPERTROPHY: 'Hipertrofia', STRENGTH: 'Fuerza', TONING: 'Tonificación', FUNCTIONAL: 'Funcional',
}
const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  BEGINNER:     { bg: '#dcfce7', text: '#15803d' },
  INTERMEDIATE: { bg: '#fef9c3', text: '#a16207' },
  ADVANCED:     { bg: '#fee2e2', text: '#b91c1c' },
}
const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Principiante', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado',
}

function TemplateCard({ tmpl, onSelect, selecting }: {
  tmpl: PublicTemplate
  onSelect: (id: string) => void
  selecting: string | null
}) {
  const isLoading = selecting === tmpl.id
  const level = LEVEL_COLORS[tmpl.level ?? ''] ?? { bg: '#f3f4f6', text: '#6b7280' }

  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
      {/* Header */}
      <LinearGradient colors={['#1e3a5f', '#2d5a8e']} style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 22 }}>{CATEGORY_ICONS[tmpl.category ?? ''] ?? '💪'}</Text>
          <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold', lineHeight: 22 }}>{tmpl.name}</Text>
        </View>
        {tmpl.level && (
          <View style={{ backgroundColor: level.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: level.text }}>{LEVEL_LABELS[tmpl.level] ?? tmpl.level}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Body */}
      <View style={{ backgroundColor: 'white', padding: 16, gap: 12 }}>
        {tmpl.description && (
          <Text style={{ fontSize: 13, color: '#4b5563', fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
            {tmpl.description}
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {tmpl.goal && (
            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11 }}>🎯</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#374151' }}>
                {GOAL_LABELS[tmpl.goal] ?? tmpl.goal}
              </Text>
            </View>
          )}
          <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11 }}>📅</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#374151' }}>
              {tmpl.trainingDays} días/semana
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            onSelect(tmpl.id)
          }}
          disabled={!!selecting}
          activeOpacity={0.85}
          style={{ backgroundColor: selecting ? '#e5e7eb' : '#f97316', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={{ color: selecting ? '#9ca3af' : 'white', fontSize: 14, fontFamily: 'Inter_700Bold' }}>
              Elegir esta rutina →
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

function TemplatePickerScreen({ insets }: { insets: { top: number; bottom: number } }) {
  const queryClient = useQueryClient()
  const [selecting, setSelecting] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['gym-templates'],
    queryFn: getPublicTemplates,
  })

  const { mutate: assign } = useMutation({
    mutationFn: assignTemplate,
    onMutate: (id) => setSelecting(id),
    onSuccess: () => {
      setDone(true)
      setSelecting(null)
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['gym-today'] }), 800)
    },
    onError: () => setSelecting(null),
  })

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  if (done) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', gap: 12 }}>
        <Text style={{ fontSize: 56 }}>✅</Text>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>Rutina asignada</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', fontFamily: 'Inter_400Regular' }}>Cargando tu sesión...</Text>
        <ActivityIndicator color="#f97316" style={{ marginTop: 8 }} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 20, gap: 4 }}
      >
        <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>Gym</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' }}>
          Elige tu rutina y empieza hoy
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {(templates ?? []).map(tmpl => (
          <TemplateCard key={tmpl.id} tmpl={tmpl} onSelect={(id) => assign(id)} selecting={selecting} />
        ))}

        {/* Coach tip */}
        <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 18 }}>👨‍💼</Text>
          <Text style={{ flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', color: '#1d4ed8', lineHeight: 18 }}>
            ¿Tienes un coach? Tu coach puede asignarte una rutina personalizada que reemplazará esta plantilla.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

export default function GymScreen() {
  const { user } = useAuthStore()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const { data: session, isLoading, isError, refetch } = useQuery({
    queryKey: ['gym-today'],
    queryFn: getTodayGymSession,
    retry: false,
  })

  if (!user?.features?.gym) {
    return <UpgradeWall icon="🏋️" title="Gym tracker" description="Registra tus sesiones de gym, sigue la progresión de cargas y accede a rutinas con el plan Pro." />
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  // Sin rutina asignada (404) → mostrar selector de plantillas públicas
  if (isError) {
    return <TemplatePickerScreen insets={insets} />
  }

  // Rutina asignada pero hoy es descanso
  if (!session || !session.workoutDay) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 24 }}>
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
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
      contentContainerStyle={{ paddingBottom: 32, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Gradient Header */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 20 }}
      >
        <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>
          Gym
        </Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {session.workoutDay.label}
        </Text>
      </LinearGradient>

      {/* Start session card */}
      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            router.push('/(app)/gym-session')
          }}
          activeOpacity={0.85}
          style={{ backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
            shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>
            Comenzar sesión · {session.exercises.length} ejercicios
          </Text>
        </TouchableOpacity>
      </View>

      {/* Muscle group pills */}
      {session.workoutDay.muscleGroups.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16 }}>
          {session.workoutDay.muscleGroups.map((mg) => (
            <View key={mg} style={{ backgroundColor: 'rgba(30,58,95,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ color: '#1e3a5f', fontSize: 12, fontFamily: 'Inter_500Medium' }}>{mg}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Ejercicios preview */}
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
          Ejercicios
        </Text>
        {session.exercises.map((ex, i) => {
          const prev = ex.previousLogs.find((l) => l.setNumber === 1)
          return (
            <View key={ex.id} style={{ backgroundColor: 'white', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
              <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>{i + 1}</Text>
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
      </View>

      {/* Historial link */}
      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity
          onPress={() => router.push('/(app)/gym-history')}
          activeOpacity={0.7}
          style={{ backgroundColor: 'white', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 18 }}>📋</Text>
            <View>
              <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>Historial de sesiones</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 2 }}>Ver todas mis sesiones</Text>
            </View>
          </View>
          <Text style={{ fontSize: 20, color: '#9ca3af' }}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
