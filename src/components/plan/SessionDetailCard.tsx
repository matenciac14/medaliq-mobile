import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SESSION_ICONS, SESSION_LABELS } from '../../constants/sessions'
import type { PlannedSession } from '../../api/plan'

const INTENSITY_BADGE: Record<string, { bg: string; text: string; emoji: string; label: string }> = {
  HIGH:     { bg: '#fff7ed', text: '#ea580c', emoji: '🔥', label: 'ALTA Intensidad' },
  MODERATE: { bg: '#fffbeb', text: '#d97706', emoji: '💪', label: 'MODERADA'        },
  LOW:      { bg: '#f0fdf4', text: '#16a34a', emoji: '🌿', label: 'BAJA Intensidad' },
  REST:     { bg: '#f9fafb', text: '#9ca3af', emoji: '😴', label: 'Descanso'        },
}

const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
}

const ZONE_COLORS: Record<string, string> = {
  Z1: '#22c55e', Z2: '#3b82f6', Z3: '#eab308', Z4: '#f97316', Z5: '#ef4444',
}

function parseStructureBlock(line: string): { zone: string | null; color: string; durationMin: number | null; text: string } {
  const parts = line.split('|')
  if (parts.length === 3) {
    const zone = parts[0].trim().toUpperCase()
    const durationMin = parseInt(parts[1].trim(), 10) || null
    const text = parts[2].trim()
    return { zone, color: ZONE_COLORS[zone] ?? '#9ca3af', durationMin, text }
  }
  const match = line.match(/\b(Z[1-5])\b/i)
  if (!match) return { zone: null, color: '#d1d5db', durationMin: null, text: line }
  const zone = match[1].toUpperCase()
  return { zone, color: ZONE_COLORS[zone] ?? '#9ca3af', durationMin: null, text: line }
}

function getIntensityKey(type: string, intensityField?: string | null): string {
  if (intensityField) return intensityField
  if (['INTERVALOS', 'TIRADA_LARGA', 'SIMULACRO', 'TEST'].includes(type)) return 'HIGH'
  if (['TEMPO', 'FARTLEK', 'CICLA', 'NATACION', 'FUERZA', 'OTRO'].includes(type)) return 'MODERATE'
  if (type === 'RODAJE_Z2') return 'LOW'
  if (type === 'DESCANSO') return 'REST'
  return 'MODERATE'
}

export default function SessionDetailCard({ session, isToday, onLog, onEdit }: {
  session: PlannedSession
  isToday: boolean
  onLog: () => void
  onEdit: () => void
}) {
  if (session.type === 'DESCANSO') {
    return (
      <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', ...SHADOW, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Text style={{ fontSize: 36 }}>😴</Text>
        <View>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#374151' }}>Día de descanso</Text>
          <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>Aprovecha para recuperar bien hoy</Text>
        </View>
      </View>
    )
  }

  const intensityKey = getIntensityKey(session.type, session.intensity)
  const badge = INTENSITY_BADGE[intensityKey] ?? INTENSITY_BADGE.MODERATE
  const stripColor = isToday ? '#ea580c' : session.completed ? '#4ade80' : session.type === 'FUERZA' ? '#a855f7' : '#1e3a5f'
  const gymSession = session.type === 'FUERZA'
  const structureText = session.detailText ?? session.structure ?? null

  const sessionTitle = gymSession
    ? (session.sportLabel ? `Fuerza — ${session.sportLabel}` : 'Fuerza')
    : (SESSION_LABELS[session.type] ?? session.type.replace(/_/g, ' '))

  const hasZone = session.zoneTarget && session.zoneTarget !== '—' && session.zoneTarget !== 'N/A' && session.zoneTarget !== ''
  const middleBadge = gymSession
    ? (session.sportLabel ?? session.type.replace(/_/g, ' '))
    : hasZone ? `Zona ${session.zoneTarget}` : null

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', ...SHADOW }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 6, backgroundColor: stripColor, alignSelf: 'stretch' }} />
        <View style={{ flex: 1, padding: 16, gap: 12 }}>

          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 22 }}>{SESSION_ICONS[session.type] ?? '🏅'}</Text>
            <Text style={{ flex: 1, fontSize: 22, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.3 }}>
              {sessionTitle}
            </Text>
            {isToday && (
              <View style={{ backgroundColor: '#ea580c', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: 'white' }}>HOY</Text>
              </View>
            )}
            {session.completed && !isToday && (
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 12 }}>✓</Text>
              </View>
            )}
          </View>

          {/* Badges row */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: '#f3f4f6', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>
                {session.durationMin} min
              </Text>
            </View>
            {middleBadge != null && (
              <View style={{ backgroundColor: '#f3f4f6', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>
                  {middleBadge}
                </Text>
              </View>
            )}
            <View style={{ backgroundColor: badge.bg, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: badge.text }}>
                {badge.emoji} {badge.label}
              </Text>
            </View>
          </View>

          {/* Structure / Exercises */}
          {structureText ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {gymSession ? 'Ejercicios' : 'Estructura'}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#f1f5f9' }} />
              </View>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 180 }}
              >
                {structureText.split('\n').filter(Boolean).map((line, idx) => {
                  const { zone, color, durationMin, text } = parseStructureBlock(line)
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2, width: 34 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                        <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color, lineHeight: 14, width: 20 }}>
                          {zone ?? ''}
                        </Text>
                      </View>
                      {durationMin != null && (
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#1f2937', width: 48, paddingTop: 1 }}>
                          {durationMin} min
                        </Text>
                      )}
                      <Text style={{ flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', color: '#4b5563', lineHeight: 20 }}>
                        {text}
                      </Text>
                    </View>
                  )
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Coach note */}
          {session.coachNote && (
            <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                💬 Nota de tu coach
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#1e40af', lineHeight: 18 }}>
                {session.coachNote}
              </Text>
            </View>
          )}

          {/* Log data — actual recorded values */}
          {session.completed && session.log && (
            <View style={{ backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 12, gap: 6 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
                Registro
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {session.log.durationMin != null && (
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#15803d' }}>
                    ⏱ {session.log.durationMin} min
                  </Text>
                )}
                {session.log.rpe != null && (
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#15803d' }}>
                    RPE {session.log.rpe}
                  </Text>
                )}
                {session.log.hrAvg != null && (
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#15803d' }}>
                    ❤️ {session.log.hrAvg} bpm
                  </Text>
                )}
                {session.log.distanceKm != null && (
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#15803d' }}>
                    📍 {session.log.distanceKm} km
                  </Text>
                )}
              </View>
              {session.log.notes ? (
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#166534', marginTop: 2 }} numberOfLines={2}>
                  {session.log.notes}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </View>

      {/* CTA */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4, flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#f9fafb' }}>
        {session.completed ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: '#bbf7d0' }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#15803d' }}>Completada</Text>
            </View>
            <TouchableOpacity
              onPress={onEdit}
              activeOpacity={0.85}
              style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#4b5563' }}>Editar sesión</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={onLog}
              activeOpacity={0.85}
              style={{ flex: 1, backgroundColor: '#ea580c', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontSize: 14, fontFamily: 'Inter_700Bold' }}>Registrar sesión →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onEdit}
              activeOpacity={0.85}
              style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#4b5563' }}>Editar sesión</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}
