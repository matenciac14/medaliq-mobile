import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { getDashboard, type WeekSession } from '../../../src/api/dashboard'
import { useAuthStore } from '../../../src/store/auth'

const SESSION_ICONS: Record<string, string> = {
  RODAJE_Z2: '🏃', FARTLEK: '🏃', TIRADA_LARGA: '🏃',
  CICLA: '🚴', NATACION: '🏊', FUERZA: '💪', DESCANSO: '😴',
}

const SESSION_SHORT: Record<string, string> = {
  RODAJE_Z2: 'Z2', FARTLEK: 'FK', TIRADA_LARGA: 'TL',
  CICLA: 'CIC', NATACION: 'NAT', FUERZA: 'FZA', DESCANSO: '·',
}

const SESSION_COLORS: Record<string, string> = {
  FUERZA: '#8b5cec',
  RODAJE_Z2: '#f97316',
  FARTLEK: '#f97316',
  TIRADA_LARGA: '#f97316',
  CICLA: '#3b82f6',
  NATACION: '#06b6d4',
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function getIntensityLabel(sessionType: string | null | undefined): string {
  if (!sessionType || sessionType === 'DESCANSO') return 'Día de descanso'
  if (['FARTLEK', 'TIRADA_LARGA'].includes(sessionType)) return 'Día intenso'
  if (['RODAJE_Z2', 'CICLA', 'NATACION', 'FUERZA'].includes(sessionType)) return 'Día moderado'
  return 'Día suave'
}

function getCoachMessage(type: string | null, duration: number | null): string {
  if (!type || type === 'DESCANSO') return 'Día de descanso. ¿Cómo te has sentido esta semana?'
  const label = SESSION_SHORT[type] ?? type.toLowerCase()
  return `Hoy tienes ${label} de ${duration ?? '?'} min. ¿Cómo te sientes?`
}

// ── Weekly Strip ──────────────────────────────────────────────────
function WeeklyStrip({ sessions, completed, total }: {
  sessions: WeekSession[]; completed: number; total: number
}) {
  const pct = total > 0 ? completed / total : 0
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 14, ...SHADOW }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Esta semana
        </Text>
        <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#f97316' }}>
          {completed}/{total} sesiones
        </Text>
      </View>
      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
        <View style={{ height: 3, width: `${pct * 100}%`, backgroundColor: '#22c55e', borderRadius: 2 }} />
      </View>
      {/* Day cells */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {sessions.map((s) => {
          const isRest = !s.type || s.type === 'DESCANSO'
          const label = s.type ? (SESSION_SHORT[s.type] ?? '?') : '·'
          const labelColor = s.isToday ? 'white' : (SESSION_COLORS[s.type ?? ''] ?? '#6b7280')
          return (
            <View key={s.dayIndex} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
              <Text style={{
                fontSize: 10,
                fontFamily: s.isToday ? 'Inter_700Bold' : 'Inter_400Regular',
                color: s.isToday ? '#1e3a5f' : '#9ca3af',
              }}>
                {DAY_LABELS[s.dayIndex]}
              </Text>
              <View style={{
                width: 28, height: 28, borderRadius: isRest ? 14 : 8, alignItems: 'center', justifyContent: 'center',
                backgroundColor: s.isToday
                  ? '#1e3a5f'
                  : s.done && !isRest
                    ? '#dcfce7'
                    : isRest
                      ? 'transparent'
                      : '#f1f5f9',
              }}>
                {s.done && !isRest ? (
                  <Text style={{ fontSize: 12, color: '#22c55e', fontFamily: 'Inter_700Bold' }}>✓</Text>
                ) : (
                  <Text style={{
                    fontSize: isRest ? 14 : 9,
                    fontFamily: 'Inter_700Bold',
                    color: isRest ? '#d1d5db' : labelColor,
                  }}>
                    {isRest ? '·' : label}
                  </Text>
                )}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ── Actionable KPI Cards ─────────────────────────────────────────
function KpiRow({ kcal, completed, total, sessionType }: {
  kcal: number | null; completed: number; total: number; sessionType?: string | null
}) {
  const intensityLabel = getIntensityLabel(sessionType)
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {/* Kcal del día */}
      <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
        <View style={{ height: 3, backgroundColor: '#f97316' }} />
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 14 }}>🔥</Text>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.3 }}>
              {kcal ? kcal.toLocaleString('es-CO') : '—'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#9ca3af' }}>kcal</Text>
          </View>
          <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>
            objetivo hoy · {intensityLabel}
          </Text>
        </View>
      </View>
      {/* Adherencia con dots */}
      <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', ...SHADOW }}>
        <View style={{ height: 3, backgroundColor: '#1e3a5f' }} />
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 14 }}>⚡</Text>
            <Text style={{ fontSize: 18, fontFamily: 'Inter_900Black', color: '#111827', letterSpacing: -0.3 }}>
              {total > 0 ? `${completed}/${total}` : '—'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#9ca3af' }}>ses</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: Math.max(total, 5) }, (_, i) => (
              <View key={i} style={{
                flex: 1, height: 8, borderRadius: 4,
                backgroundColor: i < completed ? '#22c55e' : '#e5e7eb',
              }} />
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}

// ── AI Coach Teaser ──────────────────────────────────────────────
function AICoachTeaser({ message, onPress }: { message: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
      <LinearGradient
        colors={['#1e3a5f', '#2e5c99']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}
      >
        {/* Decorative circles */}
        <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.04)', right: 60, top: -15 }} />
        <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.04)', right: 38, top: -15 }} />
        <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.04)', right: 16, top: -15 }} />
        <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.04)', right: -6, top: -15 }} />

        <Text style={{ fontSize: 22 }}>🤖</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'white', marginBottom: 3 }}>
            Tu AI Coach
          </Text>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', lineHeight: 16 }}>
            {message}
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>→</Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}

export default function DashboardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1e3a5f', textAlign: 'center' }}>
          No se pudo cargar
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', marginTop: 6, marginBottom: 20 }}>
          Revisa tu conexión e intenta de nuevo.
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{ backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ color: 'white', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const d = data
  const firstName = d.firstName || (user?.name ?? 'Atleta').split(' ')[0]

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
      contentContainerStyle={{ paddingBottom: 28, gap: 12 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Gradient Header ───────────────────────────────────── */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 22, paddingHorizontal: 20, gap: 12 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.3 }}>
            {getGreeting()}, {firstName}
          </Text>
          {d.trialDaysLeft !== null && d.trialDaysLeft > 0 && (
            <View style={{ backgroundColor: '#fef9c3', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#92400e' }}>
                {d.trialDaysLeft}d trial
              </Text>
            </View>
          )}
        </View>
        {d.planData && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
              Semana {d.planData.currentWeek}/{d.planData.totalWeeks}  ·  {d.planData.phase}
            </Text>
          </View>
        )}
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>

        {/* ── Sesión de hoy ─────────────────────────────────── */}
        {d.todaySession ? (
          <View style={{ borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
            <LinearGradient
              colors={['#1e3a5f', '#2d5a8e']}
              style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 8 }}
            >
              {/* HOY label + Zona pill en la misma fila */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.55)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  HOY
                </Text>
                <View style={{ backgroundColor: 'rgba(34,197,94,0.28)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#86efac' }}>
                    ● Zona {d.todaySession.zoneTarget}
                  </Text>
                </View>
              </View>
              {/* Emoji + duración */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 34 }}>{SESSION_ICONS[d.todaySession.type] ?? '🏅'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>
                    {d.todaySession.durationMin} min
                  </Text>
                </View>
                {d.todaySession.completed && (
                  <View style={{ backgroundColor: '#22c55e', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: 'white', fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>✓ Hecha</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular' }}>
                {d.todaySession.type.toLowerCase().replace(/_/g, ' ')}
              </Text>
            </LinearGradient>
            <View style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  router.push({
                    pathname: '/(app)/log',
                    params: {
                      sessionId: d.todaySession!.id,
                      type: d.todaySession!.type,
                      duration: String(d.todaySession!.durationMin),
                      zone: d.todaySession!.zoneTarget,
                    },
                  })
                }}
                activeOpacity={0.85}
                style={{ backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>Registrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOW }}>
            <Text style={{ fontSize: 28 }}>😴</Text>
            <View>
              <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>Día de descanso</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>Recupera bien hoy</Text>
            </View>
          </View>
        )}

        {/* ── Weekly Strip ──────────────────────────────────── */}
        {d.weekSessions.length > 0 && (
          <WeeklyStrip
            sessions={d.weekSessions}
            completed={d.completedCount}
            total={d.totalTraining}
          />
        )}

        {/* ── KPIs accionables ──────────────────────────────── */}
        <KpiRow
          kcal={d.kcalTarget}
          completed={d.completedCount}
          total={d.totalTraining}
          sessionType={d.todaySession?.type}
        />

        {/* ── AI Coach Teaser ───────────────────────────────── */}
        <AICoachTeaser
          message={getCoachMessage(d.todaySession?.type ?? null, d.todaySession?.durationMin ?? null)}
          onPress={() => router.push('/(app)/(tabs)/ai-coach')}
        />

        {/* ── Check-in pendiente ────────────────────────────── */}
        {d.checkinPending && (
          <TouchableOpacity
            onPress={() => router.push('/(app)/(tabs)/checkin')}
            activeOpacity={0.85}
            style={{ backgroundColor: '#fff7ed', borderRadius: 14, overflow: 'hidden', flexDirection: 'row', ...SHADOW }}
          >
            <View style={{ width: 4, backgroundColor: '#f97316' }} />
            <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#9a3412' }}>
                Check-in semanal pendiente
              </Text>
              <Text style={{ fontSize: 10, color: '#c2410c', fontFamily: 'Inter_400Regular', marginTop: 3 }}>
                Registra métricas  ·  tu plan se ajusta automáticamente  →
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Quick Access ──────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { emoji: '🥗', title: 'Nutrición', sub: d.kcalTarget ? `${d.kcalTarget.toLocaleString('es-CO')} kcal hoy` : 'Macros del día', accent: '#22c55e', route: '/(app)/nutrition' },
            { emoji: '📈', title: 'Progreso',  sub: d.planData ? `Semana ${d.planData.currentWeek}` : 'Ver evolución', accent: '#3b82f6', route: '/(app)/progress' },
          ].map((item) => (
            <TouchableOpacity
              key={item.title}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.85}
              style={{ flex: 1, backgroundColor: 'white', borderRadius: 14, overflow: 'hidden', ...SHADOW }}
            >
              {/* Left colored bar */}
              <View style={{ position: 'absolute', left: 0, top: 15, width: 3, height: 40, backgroundColor: item.accent, borderRadius: 2 }} />
              <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                <View>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>{item.title}</Text>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#6b7280', marginTop: 2 }}>{item.sub}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </View>
    </ScrollView>
  )
}
