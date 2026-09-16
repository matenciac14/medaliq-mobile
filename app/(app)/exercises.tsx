import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Image, Modal, FlatList,
} from 'react-native'
import { useState, useCallback } from 'react'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { getExercises, getExerciseDetail, type MobileExercise, type ExerciseDetail } from '../../src/api/exercises'

const BODY_PARTS: { key: string; label: string }[] = [
  { key: '',         label: 'Todos' },
  { key: 'waist',   label: 'Cintura' },
  { key: 'back',    label: 'Espalda' },
  { key: 'chest',   label: 'Pecho' },
  { key: 'upper arms', label: 'Brazos' },
  { key: 'upper legs', label: 'Piernas' },
  { key: 'lower legs', label: 'Gemelos' },
  { key: 'shoulders', label: 'Hombros' },
  { key: 'neck',    label: 'Cuello' },
]

// ── Exercise Card ─────────────────────────────────────────────────

function ExerciseCard({ ex, onPress }: { ex: MobileExercise; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1, backgroundColor: 'white', borderRadius: 14, borderWidth: 1,
        borderColor: '#e5e7eb', overflow: 'hidden', margin: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
      }}
    >
      <View style={{ backgroundColor: '#f9fafb', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
        {ex.gif ? (
          <Image source={{ uri: ex.gif }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        ) : (
          <Text style={{ fontSize: 32 }}>💪</Text>
        )}
      </View>
      <View style={{ padding: 10 }}>
        <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#111827', lineHeight: 16 }} numberOfLines={2}>
          {ex.nameEs ?? ex.name}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          <View style={{ backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#2563eb' }}>
              {ex.bodyPart}
            </Text>
          </View>
          {ex.difficulty && (
            <View style={{ backgroundColor: '#fff7ed', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_500Medium', color: '#ea580c' }}>{ex.difficulty}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ── Exercise Detail Modal ─────────────────────────────────────────

function ExerciseModal({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['exercise-detail', exerciseId],
    queryFn: () => getExerciseDetail(exerciseId),
  })

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {isLoading || !data ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#f97316" size="large" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* GIF */}
            {data.gif && (
              <View style={{ backgroundColor: '#f9fafb', height: 240, alignItems: 'center', justifyContent: 'center' }}>
                <Image source={{ uri: data.gif }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              </View>
            )}

            <View style={{ padding: 20, gap: 16 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#1e3a5f', lineHeight: 26 }}>
                    {data.nameEs ?? data.name}
                  </Text>
                  {data.nameEs && (
                    <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{data.name}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                  <Ionicons name="close" size={22} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Tags */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[data.bodyPart, data.target, data.difficulty, data.mechanic, data.force, data.equipment]
                  .filter(Boolean)
                  .map((tag, i) => (
                    <View key={i} style={{ backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#374151' }}>{tag}</Text>
                    </View>
                  ))}
              </View>

              {/* Secondary muscles */}
              {data.secondaryMuscles?.length > 0 && (
                <View>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                    Músculos secundarios
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {data.secondaryMuscles.map((m, i) => (
                      <View key={i} style={{ backgroundColor: '#f9fafb', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#e5e7eb' }}>
                        <Text style={{ fontSize: 11, color: '#6b7280' }}>{m}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Instructions */}
              {(data.instructionsEs?.length > 0 || data.instructions?.length > 0) && (
                <View>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                    Instrucciones
                  </Text>
                  <View style={{ gap: 10 }}>
                    {(data.instructionsEs?.length > 0 ? data.instructionsEs : data.instructions).map((step, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 }}>
                          <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: 'white' }}>{i + 1}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 13, color: '#374151', lineHeight: 20, fontFamily: 'Inter_400Regular' }}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Description */}
              {data.description && (
                <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 20, fontFamily: 'Inter_400Regular' }}>
                  {data.description}
                </Text>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}

// ── Main Screen ───────────────────────────────────────────────────

export default function ExercisesScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [q, setQ] = useState('')
  const [bodyPart, setBodyPart] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['mobile-exercises', q, bodyPart, page],
    queryFn: () => getExercises({ q: q || undefined, bodyPart: bodyPart || undefined, page }),
    placeholderData: (prev) => prev,
  })

  const handleSearch = useCallback((text: string) => {
    setQ(text)
    setPage(1)
  }, [])

  const handleBodyPart = useCallback((key: string) => {
    setBodyPart(key)
    setPage(1)
  }, [])

  const exercises = data?.exercises ?? []
  const totalPages = data?.pages ?? 1

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>
              Ejercicios
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
              {data ? `${data.total} ejercicios` : 'Cargando...'}
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 12, height: 40, gap: 8 }}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            value={q}
            onChangeText={handleSearch}
            placeholder="Buscar ejercicio..."
            placeholderTextColor="#9ca3af"
            style={{ flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#111827' }}
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Body part filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
      >
        {BODY_PARTS.map((bp) => (
          <TouchableOpacity
            key={bp.key}
            onPress={() => handleBodyPart(bp.key)}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              backgroundColor: bodyPart === bp.key ? '#1e3a5f' : 'white',
              borderWidth: 1, borderColor: bodyPart === bp.key ? '#1e3a5f' : '#e5e7eb',
            }}
          >
            <Text style={{
              fontSize: 12, fontFamily: 'Inter_600SemiBold',
              color: bodyPart === bp.key ? 'white' : '#6b7280',
            }}>
              {bp.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      ) : exercises.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Text style={{ fontSize: 36 }}>🔍</Text>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>Sin resultados</Text>
          <Text style={{ fontSize: 13, color: '#9ca3af' }}>Intenta con otros términos</Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(ex) => ex.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ExerciseCard ex={item} onPress={() => setSelectedId(item.id)} />
            </View>
          )}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 16 }}>
                <TouchableOpacity
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: page === 1 ? '#f3f4f6' : 'white', borderWidth: 1, borderColor: '#e5e7eb' }}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: page === 1 ? '#9ca3af' : '#374151' }}>← Anterior</Text>
                </TouchableOpacity>
                <View style={{ justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>{page} / {totalPages}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isFetching}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: page === totalPages ? '#f3f4f6' : 'white', borderWidth: 1, borderColor: '#e5e7eb' }}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: page === totalPages ? '#9ca3af' : '#374151' }}>Siguiente →</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Detail modal */}
      {selectedId && (
        <ExerciseModal exerciseId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </View>
  )
}
