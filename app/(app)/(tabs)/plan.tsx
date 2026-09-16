import { useState, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { getPlan, getCalendarWeek, type PlannedSession, type PlanData, type LastCompletedPlan, type CalendarWeek, type CalendarDay } from '../../../src/api/plan'
import { getDashboard } from '../../../src/api/dashboard'
import { useAuthStore } from '../../../src/store/auth'
import UpgradeWall from '../../../src/components/UpgradeWall'
import CalendarStrip, { type DayCell } from '../../../src/components/CalendarStrip'
import NutritionProgressCard from '../../../src/components/dashboard/NutritionProgressCard'
import HydrationWidget from '../../../src/components/dashboard/HydrationWidget'
import MealSlotsWidget from '../../../src/components/dashboard/MealSlotsWidget'
import PhaseProgress from '../../../src/components/plan/PhaseProgress'
import AdherenceCompact from '../../../src/components/plan/AdherenceCompact'
import BodyComposition from '../../../src/components/plan/BodyComposition'
import EstadoSemana from '../../../src/components/plan/EstadoSemana'
import ZonasFC from '../../../src/components/plan/ZonasFC'
import CheckInBanner from '../../../src/components/plan/CheckInBanner'
import SessionDetailCard from '../../../src/components/plan/SessionDetailCard'
import KPICards from '../../../src/components/plan/KPICards'

// ── Constants ────────────────────────────────────────────────────────
import { DAY_LETTERS, DAY_SHORT, MONTHS } from '../../../src/constants/calendar'
import { SESSION_LABELS, SESSION_ICONS } from '../../../src/constants/sessions'

const PLAN_NAME_MAP: Record<string, string> = {
  RACE_HALF_MARATHON: 'Media Maratón', RACE_MARATHON: 'Maratón',
  RACE_10K: '10K', RACE_5K: '5K',
  RACE_CYCLING: 'Ciclismo', RACE_TRIATHLON: 'Triatlón',
  BODY_RECOMPOSITION: 'Recomposición Corporal',
  WEIGHT_LOSS: 'Pérdida de Peso', GENERAL_FITNESS: 'Fitness General',
  HALF_MARATHON_18W: 'Media Maratón', TEN_K_12W: '10K',
  FIVE_K_8W: '5K', BODY_RECOMPOSITION_16W: 'Recomposición Corporal',
}

const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatPlanName(name: string): string {
  const base = name.split(' — ')[0].split(' - ')[0].replace(/^Plan\s+/i, '').trim()
  return PLAN_NAME_MAP[base] ?? base
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function getWeekMonday(currentWeekNum: number, activeWeekNum: number): Date {
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 7 : today.getDay()
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() - (todayDow - 1))
  thisMonday.setHours(0, 0, 0, 0)
  const monday = new Date(thisMonday)
  monday.setDate(thisMonday.getDate() + (activeWeekNum - currentWeekNum) * 7)
  return monday
}

function formatWeekRange(monday: Date): string {
  const sun = new Date(monday); sun.setDate(monday.getDate() + 6)
  if (monday.getMonth() === sun.getMonth()) {
    return `${monday.getDate()}–${sun.getDate()} ${MONTHS[monday.getMonth()]}`
  }
  return `${monday.getDate()} ${MONTHS[monday.getMonth()]} – ${sun.getDate()} ${MONTHS[sun.getMonth()]}`
}

// ── SesionLibreCard — matches web SesionLibreCard ────────────────────

function SesionLibreCard({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', ...SHADOW }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#e5eaf0', borderRadius: 2 }} />
      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 22 }}>📝</Text>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1c2b45' }}>Sesión libre</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ backgroundColor: '#f0f1f4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7582' }}>— min</Text>
          </View>
          <View style={{ backgroundColor: '#f0f1f4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6b7582' }}>Zona 2–3</Text>
          </View>
          <View style={{ backgroundColor: '#fff1ea', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#ea580c' }}>Libre</Text>
          </View>
        </View>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#8c9eb2', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Registra actividad libre
        </Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(app)/log' as never) }}
          activeOpacity={0.85}
          style={{ backgroundColor: '#ea580c', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
        >
          <Text style={{ color: 'white', fontSize: 14, fontFamily: 'Inter_700Bold' }}>Registrar sesión libre →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── PlanScreen ───────────────────────────────────────────────────────

export default function PlanScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()

  const todayDow = useMemo(() => {
    const d = new Date().getDay()
    return d === 0 ? 7 : d
  }, [])

  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null)
  const [selectedDow, setSelectedDow] = useState(todayDow)

  const { data: planRaw, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['plan'], queryFn: getPlan })
  const plan: PlanData | null = planRaw && 'id' in planRaw ? planRaw as PlanData : null
  const lastCompletedPlan: LastCompletedPlan | null = planRaw && 'lastCompletedPlan' in planRaw ? (planRaw as { lastCompletedPlan: LastCompletedPlan }).lastCompletedPlan : null
  const { data: dash, refetch: refetchDash } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })

  // Calendar week — gym/freeRun overlay for the selected plan week
  const calWeekOffset = plan ? ((selectedWeekNum ?? plan.currentWeek) - plan.currentWeek) : 0
  const { data: calWeek, refetch: refetchCal } = useQuery({
    queryKey: ['planCalendarWeek', calWeekOffset],
    queryFn: () => getCalendarWeek(calWeekOffset),
  })

  // Refetch when returning from any screen (e.g. after edit-session or log)
  useFocusEffect(useCallback(() => { refetch(); refetchCal(); refetchDash() }, [refetch, refetchCal, refetchDash]))

  // Monday of current week — used by empty state week nav
  const baseMonday = useMemo(() => {
    const today = new Date()
    const dow = today.getDay() === 0 ? 7 : today.getDay()
    const mon = new Date(today)
    mon.setDate(today.getDate() - (dow - 1))
    mon.setHours(0, 0, 0, 0)
    return mon
  }, [])

  if (!user?.features?.plan) {
    return (
      <UpgradeWall
        icon="📅"
        title="Mi Plan"
        description="Accede a tu plan periodizado, CalendarStrip interactivo y métricas semanales con el plan Pro."
      />
    )
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    )
  }

  // ── Completed State ────────────────────────────────────────────────
  if (!plan && lastCompletedPlan) {
    const adherencePct = lastCompletedPlan.sessionsTotal > 0
      ? Math.round((lastCompletedPlan.sessionsLogged / lastCompletedPlan.sessionsTotal) * 100)
      : 0
    const completedDate = lastCompletedPlan.endDate
      ? new Date(lastCompletedPlan.endDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
      : null
    const isB2B = dash?.isB2B ?? false
    const nt = dash?.nutritionTarget ?? null

    return (
      <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Header — navy gradient */}
          <LinearGradient colors={['#1e3a5f', '#2d5a8e']} style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' }}>Mi Plan</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                  Plan {formatPlanName(lastCompletedPlan.name)} · {lastCompletedPlan.totalWeeks} semanas
                </Text>
              </View>
              <View style={{ backgroundColor: 'rgba(34,197,94,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#86efac' }}>✓ COMPLETADO</Text>
              </View>
            </View>
            {completedDate && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>
                  Completado el {completedDate}
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Calendar Strip — all done (completed plan) */}
          <CalendarStrip
            days={(() => {
              const baseDate = lastCompletedPlan.endDate ? new Date(lastCompletedPlan.endDate) : new Date()
              const endDow = baseDate.getDay() === 0 ? 7 : baseDate.getDay()
              return Array.from({ length: 7 }, (_, i) => {
                const dayDate = new Date(baseDate)
                dayDate.setDate(baseDate.getDate() - (endDow - 1) + i)
                return {
                  dow: i + 1, letter: DAY_SHORT[i], dateNum: dayDate.getDate(),
                  type: 'COMPLETED' as string, done: true, isToday: false, canLog: false,
                }
              })
            })()}
            selectedDow={null}
            onSelect={() => {}}
            completedCount={7}
            totalTraining={7}
          />

          <View style={{ paddingHorizontal: 16, gap: 16 }}>
            {/* Celebration card */}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 24, alignItems: 'center', ...SHADOW }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🏆</Text>
              <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#111827', textAlign: 'center' }}>
                ¡Plan completado!
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                {lastCompletedPlan.name} · {lastCompletedPlan.totalWeeks} semanas
              </Text>
              <View style={{ flexDirection: 'row', gap: 32, marginTop: 16 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontFamily: 'Inter_900Black', color: '#111827' }}>{lastCompletedPlan.totalWeeks}</Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>semanas</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontFamily: 'Inter_900Black', color: '#111827' }}>{lastCompletedPlan.sessionsLogged}</Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>sesiones</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontFamily: 'Inter_900Black', color: '#ea580c' }}>{adherencePct}%</Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>adherencia</Text>
                </View>
              </View>
            </View>

            <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Esta semana
            </Text>

            {/* KPIs */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', padding: 12, ...SHADOW }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Completadas</Text>
                <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#111827' }}>{lastCompletedPlan.sessionsLogged}/{lastCompletedPlan.sessionsTotal}</Text>
                <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>sesiones</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', padding: 12, ...SHADOW }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Volumen</Text>
                <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#111827' }}>{lastCompletedPlan.totalWeeks * 4}</Text>
                <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>en el plan</Text>
              </View>
              <View style={{
                flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, ...SHADOW,
                borderWidth: adherencePct < 80 ? 2 : 1,
                borderColor: adherencePct < 80 ? 'rgba(234,88,12,0.3)' : '#f1f5f9',
              }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Adherencia</Text>
                <Text style={{ fontSize: 20, fontFamily: 'Inter_900Black', color: '#ea580c' }}>{adherencePct}%</Text>
                <Text style={{ fontSize: 10, color: adherencePct < 80 ? '#ef4444' : '#9ca3af', marginTop: 2 }}>
                  {adherencePct < 80 ? '↓ meta 80%' : '✓ objetivo'}
                </Text>
              </View>
            </View>

            {/* Phase progress — completado */}
            <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, ...SHADOW }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827' }}>Progreso del plan</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                  Plan completado {lastCompletedPlan.totalWeeks}/{lastCompletedPlan.totalWeeks} · 100%
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['Base', 'Desarrollo', 'Específico', 'Afinamiento'].map(p => (
                  <View key={p} style={{
                    flex: 1, paddingVertical: 8, borderRadius: 10,
                    alignItems: 'center', backgroundColor: '#1e3a5f',
                  }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
                      {'✓ '}{p.length > 8 ? p.slice(0, 7) + '.' : p}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Nutrición Hoy */}
            {nt && (
              <NutritionProgressCard
                target={{ kcal: nt.kcal, proteinG: nt.proteinG, carbsG: nt.carbsG, fatG: nt.fatG }}
                consumed={dash?.todayFoodTotals ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }}
                onPress={() => router.push('/nutrition' as never)}
              />
            )}

            {/* Estado semanal */}
            <EstadoSemana
              checkInData={dash?.checkInData ?? null}
              formStatus={dash?.formStatus ?? null}
              formMessage={dash?.formMessage ?? null}
              lastCheckinDaysAgo={dash?.lastCheckinDaysAgo ?? null}
            />

            {/* Zonas FC */}
            <ZonasFC hrZones={dash?.hrZones ?? null} />

            {/* Body composition */}
            <BodyComposition
              weightKg={dash?.metrics.weightKg ?? null}
              weightGoalKg={dash?.metrics.weightGoalKg ?? null}
              weeklyWeightChange={dash?.weeklyWeightChange ?? null}
            />

            {/* Hydration + Meals */}
            <HydrationWidget initialMl={dash?.waterData?.mlLogged} initialTarget={dash?.waterData?.waterMlTarget} />
            <MealSlotsWidget logs={dash?.mealSlotLogs ?? null} />

            {/* CTA card */}
            {isB2B ? (
              <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', padding: 20, ...SHADOW }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>Tu coach asignará el próximo plan</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                  Recibirás una notificación cuando tu entrenador lo haya preparado.
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', padding: 20, gap: 12, ...SHADOW }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>¿Listo para el siguiente desafío?</Text>
                <TouchableOpacity
                  onPress={() => router.push('/find-coach' as never)}
                  style={{ backgroundColor: '#1e3a5f', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' }}>Buscar entrenador →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Check-in banner */}
            <CheckInBanner recordedAt={dash?.checkInData?.recordedAt ?? null} />
          </View>
        </ScrollView>
      </View>
    )
  }

  // ── Tracking State (no plan — show real activity from calendar) ─────
  if (!plan) {
    return (
      <TrackingMode
        router={router} insets={insets}
        todayDow={todayDow} dash={dash} refetch={refetch} isRefetching={isRefetching}
      />
    )
  }

  // ── Derived state (active plan) ──────────────────────────────────

  const currentWeekNum    = plan.currentWeek
  const activeWeekNum     = selectedWeekNum ?? currentWeekNum
  const isCurrentWeek     = activeWeekNum === currentWeekNum
  const week              = plan.weeks.find(w => w.weekNumber === activeWeekNum) ?? plan.weeks[0]
  const realCurrentPhase  = plan.weeks.find(w => w.weekNumber === currentWeekNum)?.phase ?? 'BASE'
  const allPhases         = [...new Set(plan.weeks.map(w => w.phase))]

  // Week dates (Mon–Sun of active week)
  const weekMonday = getWeekMonday(currentWeekNum, activeWeekNum)
  const weekDates  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekMonday)
    d.setDate(weekMonday.getDate() + i)
    return d
  })

  // Calendar strip days — merge plan sessions + calendar gym/freeRun
  const stripDays: DayCell[] = Array.from({ length: 7 }, (_, i) => {
    const dow     = i + 1
    const session = week?.sessions.find(s => s.dayOfWeek === dow)
    const calDay  = calWeek?.days.find(d => d.dow === dow)
    const isToday  = isCurrentWeek && dow === todayDow
    const isFuture = isCurrentWeek && dow > todayDow
    const hasSession = !!session && session.type !== 'DESCANSO'
    const canLog   = hasSession && !session!.completed && !isFuture && !!session!.id
    // Done = plan session completed OR gym/freeRun/sport from calendar
    const done = hasSession
      ? session!.completed
      : !!(calDay?.gym?.done || calDay?.freeRun || calDay?.sport?.done)
    return {
      dow, letter: DAY_SHORT[i], dateNum: weekDates[i].getDate(),
      type: session?.type ?? null,
      done,
      isToday, canLog,
      gymLabel: !hasSession ? calDay?.gym?.label ?? null : null,
    }
  })

  // Selected session + calendar day overlay
  const selectedSession = week?.sessions.find(s => s.dayOfWeek === selectedDow) ?? null
  const selectedCalDay = calWeek?.days.find(d => d.dow === selectedDow) ?? null
  const selectedLabel   = `${DAY_SHORT[selectedDow - 1]} ${weekDates[selectedDow - 1]?.getDate()}`

  // Gym days from calendar that DON'T overlap plan training sessions (avoid double count)
  const planTrainingDows = new Set(week?.sessions.filter(s => s.type !== 'DESCANSO').map(s => s.dayOfWeek) ?? [])
  const gymDays = calWeek?.days.filter(d => !planTrainingDows.has(d.dow) && d.gym) ?? []
  const gymDaysUpToToday = isCurrentWeek ? gymDays.filter(d => d.dow <= todayDow) : gymDays
  const gymCompleted = gymDaysUpToToday.filter(d => d.gym!.done).length
  const gymTotal = gymDaysUpToToday.length

  // KPI — current week: use server values (consistent with dashboard); other weeks: compute locally
  const planCompleted = week?.sessions.filter(s => s.completed && s.type !== 'DESCANSO').length ?? 0
  const localCompleted = planCompleted + gymCompleted
  const todaySessions  = isCurrentWeek
    ? (week?.sessions.filter(s => s.type !== 'DESCANSO' && s.dayOfWeek <= todayDow) ?? [])
    : (week?.sessions.filter(s => s.type !== 'DESCANSO') ?? [])
  const localTotal  = (isCurrentWeek ? todaySessions.length : (week?.sessions.filter(s => s.type !== 'DESCANSO').length ?? 0)) + gymTotal
  const completedCount = isCurrentWeek && dash ? dash.completedCount : localCompleted
  const totalTraining  = isCurrentWeek && dash ? dash.totalTraining : localTotal
  const adherencePct: number | null = totalTraining > 0 ? Math.round((completedCount / totalTraining) * 100) : null

  // Volume label
  const gymPlan = plan.name.toLowerCase().includes('recomp')
    || plan.name.toLowerCase().includes('body')
    || plan.name.toLowerCase().includes('fuerza')
    || (week?.sessions.filter(s => s.type === 'FUERZA').length ?? 0) >
       (week?.sessions.filter(s => s.type !== 'FUERZA' && s.type !== 'DESCANSO').length ?? 0)

  let volumeLabel: string
  if (gymPlan) {
    let totalMin = week?.sessions
      .filter(s => s.completed && s.type !== 'DESCANSO')
      .reduce((sum, s) => sum + (s.durationMin ?? 0), 0) ?? 0
    // Add gym minutes from calendar (non-overlapping plan days)
    for (const d of gymDays) {
      if (d.gym?.done && d.gym.durationMin) totalMin += d.gym.durationMin
    }
    volumeLabel = totalMin > 0 ? formatTime(totalMin) : '0 min'
  } else {
    volumeLabel = `${week?.volumeKm ?? 0} km`
  }

  // Nutrition (from dashboard — today's adjusted target)
  const nt = dash?.nutritionTarget ?? null

  // Next day session preview (skip on Sunday — next Monday is a different week)
  const nextDow = selectedDow < 7 ? selectedDow + 1 : null
  const nextSession = nextDow ? (week?.sessions.find(s => s.dayOfWeek === nextDow && s.type !== 'DESCANSO') ?? null) : null

  // Pending suggestions from dashboard
  const pendingSuggestionsCount = dash?.pendingSuggestionsCount ?? 0

  // ── Handlers ────────────────────────────────────────────────────

  function handleWeekChange(delta: number) {
    if (!plan) return
    Haptics.selectionAsync()
    const next = activeWeekNum + delta
    if (next < 1 || next > plan.totalWeeks) return
    setSelectedWeekNum(next)
    // Keep selected dow or fall back to first session of new week
    const nextWeek = plan.weeks.find(w => w.weekNumber === next)
    const hasDow   = nextWeek?.sessions.some(s => s.dayOfWeek === selectedDow)
    if (!hasDow) {
      const first = nextWeek?.sessions.find(s => s.type !== 'DESCANSO')
      if (first) setSelectedDow(first.dayOfWeek)
    }
  }

  function handleLogSession() {
    if (!selectedSession) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push({
      pathname: '/(app)/log',
      params: {
        sessionId: selectedSession.id,
        type:      selectedSession.type,
        duration:  String(selectedSession.durationMin),
        zone:      selectedSession.zoneTarget || '—',
      },
    })
  }

  function handleEditSession() {
    if (!selectedSession) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({
      pathname: '/(app)/edit-session',
      params: {
        sessionId:   selectedSession.id,
        type:        selectedSession.type,
        duration:    String(selectedSession.durationMin),
        zone:        selectedSession.zoneTarget || '',
        detail:      selectedSession.detailText || '',
        logId:       selectedSession.log?.id ?? '',
        logDuration: String(selectedSession.log?.durationMin ?? ''),
        logRpe:      String(selectedSession.log?.rpe ?? ''),
        logHrAvg:    String(selectedSession.log?.hrAvg ?? ''),
        logNotes:    selectedSession.log?.notes ?? '',
      },
    })
  }

  // ── Render (active plan) ────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>

      {/* ── Header ── */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 20, gap: 4 }}
      >
        {/* Title + Phase badge */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: 'white', letterSpacing: -0.3 }}>
            Mi Plan
          </Text>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 20,
            paddingHorizontal: 10, paddingVertical: 4, marginTop: 2,
          }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: 'rgba(147,197,253,1)' }}>
              {realCurrentPhase} · Sem {currentWeekNum}/{plan.totalWeeks}
            </Text>
          </View>
        </View>

        {/* Subtitle */}
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' }}>
          Plan {formatPlanName(plan.name)} · {plan.totalWeeks} semanas
        </Text>

        {/* Coach badge + Race countdown */}
        {(dash?.coach || (dash?.raceDays != null && dash.raceDays > 0)) && (
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            {dash?.isB2B && dash?.coach && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' }} />
                <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#86efac' }}>
                  Diseñado por Coach {dash.coach.name.split(' ')[0]}
                </Text>
              </View>
            )}
            {dash?.raceDays != null && dash.raceDays > 0 && (
              <View style={{ backgroundColor: 'rgba(234,88,12,0.8)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>
                  {'🏃 '}{dash.raceDays}d para la carrera
                </Text>
              </View>
            )}
          </View>
        )}

        {/* WeekNav */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', marginTop: 8,
          backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, height: 40,
        }}>
          <TouchableOpacity
            onPress={() => handleWeekChange(-1)}
            disabled={activeWeekNum <= 1}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}
          >
            <Ionicons name="chevron-back" size={16} color={activeWeekNum <= 1 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)'} />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
            Semana {activeWeekNum} · {formatWeekRange(weekMonday)}
          </Text>
          {!isCurrentWeek && (
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setSelectedWeekNum(null); setSelectedDow(todayDow) }}
              activeOpacity={0.8}
              style={{ backgroundColor: '#ea580c', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4, marginRight: 4 }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: 'white' }}>Hoy</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => handleWeekChange(1)}
            disabled={activeWeekNum >= plan.totalWeeks}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}
          >
            <Ionicons name="chevron-forward" size={16} color={activeWeekNum >= plan.totalWeeks ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)'} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Calendar Strip ── */}
      <CalendarStrip
        days={stripDays}
        selectedDow={selectedDow}
        onSelect={setSelectedDow}
        completedCount={completedCount}
        totalTraining={totalTraining}
      />

      {/* ── Scrollable content ── */}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
      >
        {/* Chips de semana: recuperación + foco */}
        {(week.isRecoveryWeek || week.focusDescription) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {week.isRecoveryWeek && (
              <View style={{ backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#15803d' }}>🌿 Semana de recuperación</Text>
              </View>
            )}
            {week.focusDescription && (
              <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#93c5fd', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#1d4ed8' }}>{week.focusDescription}</Text>
              </View>
            )}
          </View>
        )}

        {/* Adjustment banner — pending check-in suggestions */}
        {pendingSuggestionsCount > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/checkin' as never)}
            activeOpacity={0.7}
            style={{
              backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}
          >
            <Text style={{ fontSize: 18 }}>🔄</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#1e40af' }}>Ajuste disponible</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#3b82f6' }}>
                {pendingSuggestionsCount} {pendingSuggestionsCount === 1 ? 'sugerencia' : 'sugerencias'} de tu check-in
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#93c5fd" />
          </TouchableOpacity>
        )}

        {/* Session header label — synced with web */}
        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          {selectedLabel} · Sesión del día
        </Text>

        {/* Session card — plan session > calendar activity > empty/rest */}
        {selectedSession && selectedSession.type !== 'DESCANSO' ? (
          <SessionDetailCard
            session={selectedSession}
            isToday={isCurrentWeek && selectedDow === todayDow}
            onLog={handleLogSession}
            onEdit={handleEditSession}
          />
        ) : (selectedCalDay?.gym || selectedCalDay?.freeRun || selectedCalDay?.sport?.done) ? (
          <TrackingDayCard
            day={selectedCalDay!}
            isToday={isCurrentWeek && selectedDow === todayDow}
            router={router}
          />
        ) : selectedSession?.type === 'DESCANSO' ? (
          <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', ...SHADOW, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Text style={{ fontSize: 36 }}>😴</Text>
            <View>
              <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#374151' }}>Día de descanso</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>Aprovecha para recuperar bien hoy</Text>
            </View>
          </View>
        ) : (
          <SesionLibreCard router={router} />
        )}

        {/* Next day preview */}
        {nextSession && (
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setSelectedDow(nextDow!) }}
            activeOpacity={0.7}
            style={{
              backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}
          >
            <Text style={{ fontSize: 14 }}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>Mañana</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: '#1f2937' }} numberOfLines={1}>
                {nextSession.detailText?.slice(0, 28) || SESSION_LABELS[nextSession.type] || nextSession.type.replace(/_/g, ' ')}
                {' · '}{nextSession.durationMin} min
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
          </TouchableOpacity>
        )}

        {/* KPI section — synced with web */}
        <Text style={{
          fontSize: 10, fontFamily: 'Inter_700Bold', color: '#9ca3af',
          textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4,
        }}>
          Esta semana
        </Text>
        <KPICards
          completed={completedCount}
          total={totalTraining}
          volumeLabel={volumeLabel}
          adherencePct={adherencePct}
        />

        {/* Phase progress — Figma order: after KPI */}
        <PhaseProgress
          planPhases={allPhases}
          currentPhase={realCurrentPhase}
          currentWeekNum={currentWeekNum}
          totalWeeks={plan.totalWeeks}
          weeks={plan.weeks}
          isGymPlan={gymPlan}
        />

        {/* Adherence compact — Figma order: after Phase */}
        <AdherenceCompact
          weekSessions={week?.sessions ?? []}
          todayDow={todayDow}
          isCurrentWeek={isCurrentWeek}
          gymDays={gymDays.map(d => ({ dow: d.dow, done: !!d.gym?.done }))}
        />

        {/* Nutrition card — Figma order: after Adherence */}
        {nt && (
          <NutritionProgressCard
            target={{ kcal: nt.kcal, proteinG: nt.proteinG, carbsG: nt.carbsG, fatG: nt.fatG }}
            consumed={dash?.todayFoodTotals ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }}
            onPress={() => router.push('/nutrition' as never)}
          />
        )}

        {/* Body composition */}
        <BodyComposition
          weightKg={dash?.metrics.weightKg ?? null}
          weightGoalKg={dash?.metrics.weightGoalKg ?? null}
          weeklyWeightChange={dash?.weeklyWeightChange ?? null}
        />

        {/* Estado semanal (check-in metrics) */}
        <EstadoSemana
          checkInData={dash?.checkInData ?? null}
          formStatus={dash?.formStatus ?? null}
          formMessage={dash?.formMessage ?? null}
          lastCheckinDaysAgo={dash?.lastCheckinDaysAgo ?? null}
        />

        {/* Zonas FC */}
        <ZonasFC hrZones={dash?.hrZones ?? null} />

        {/* Hydration + Meals */}
        <HydrationWidget initialMl={dash?.waterData?.mlLogged} initialTarget={dash?.waterData?.waterMlTarget} />
        <MealSlotsWidget logs={dash?.mealSlotLogs ?? null} />

        {/* Check-in banner */}
        <CheckInBanner recordedAt={dash?.checkInData?.recordedAt ?? null} />
      </ScrollView>
    </View>
  )
}

// ── TrackingMode — no plan, show real calendar activity ──────────────

type TrackingModeProps = {
  router: ReturnType<typeof useRouter>
  insets: { top: number }
  todayDow: number
  dash: ReturnType<typeof getDashboard> extends Promise<infer T> ? T | undefined : never
  refetch: () => void
  isRefetching: boolean
}

function TrackingMode({ router, insets, todayDow, dash, refetch, isRefetching }: TrackingModeProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDow, setSelectedDow] = useState(todayDow)
  const isB2B = dash?.isB2B ?? false

  const { data: calWeek, isLoading: calLoading } = useQuery({
    queryKey: ['trackingCalendarWeek', weekOffset],
    queryFn: () => getCalendarWeek(weekOffset),
  })

  const isCurrentWeek = weekOffset === 0

  // Selected day
  const selectedDay = useMemo(
    () => calWeek?.days.find(d => d.dow === selectedDow) ?? null,
    [calWeek, selectedDow],
  )

  // KPIs
  const weekStats = useMemo(() => {
    if (!calWeek?.days) return { sessions: 0, totalMin: 0 }
    let sessions = 0
    let totalMin = 0
    for (const d of calWeek.days) {
      if (d.sport?.done) { sessions++; totalMin += d.sport.logDurationMin ?? d.sport.durationMin }
      if (d.gym?.done) { sessions++; totalMin += d.gym.durationMin ?? 0 }
      if (d.freeRun) { sessions++; totalMin += d.freeRun.durationMin ?? 0 }
    }
    return { sessions, totalMin }
  }, [calWeek])

  const timeLabel = weekStats.totalMin >= 60
    ? `${Math.floor(weekStats.totalMin / 60)}h ${weekStats.totalMin % 60}m`
    : weekStats.totalMin > 0 ? `${weekStats.totalMin} min` : '—'

  // Build DayCell[] from calWeek for CalendarStrip (same visual as Dashboard + Active Plan)
  const trackingStripDays: DayCell[] = useMemo(() => {
    if (!calWeek?.days) return Array.from({ length: 7 }, (_, i) => ({
      dow: i + 1, letter: DAY_SHORT[i], dateNum: 0, type: null, done: false, isToday: false, canLog: false,
    }))
    return calWeek.days.map((day, i) => {
      const hasActivity = !!(day.sport?.done || day.gym?.done || day.freeRun)
      return {
        dow: day.dow,
        letter: DAY_SHORT[day.dow - 1],
        dateNum: day.dateNum,
        type: day.sport?.type ?? null,
        done: hasActivity,
        isToday: isCurrentWeek && day.dow === todayDow,
        canLog: false,
        gymLabel: day.gym && !day.sport ? day.gym.label : null,
      }
    })
  }, [calWeek, isCurrentWeek, todayDow])

  const nt = dash?.nutritionTarget ?? null

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* Header */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 20, gap: 4 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' }}>Mi Plan</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Modo tracking</Text>
          </View>
        </View>

        {/* Week Nav */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', marginTop: 8,
          backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, height: 40,
        }}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setWeekOffset(w => Math.max(w - 1, -52)); setSelectedDow(todayDow) }}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}
          >
            <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
            {calWeek?.label ?? 'Cargando…'}
          </Text>
          {!isCurrentWeek && (
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setWeekOffset(0); setSelectedDow(todayDow) }}
              activeOpacity={0.8}
              style={{ backgroundColor: '#ea580c', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4, marginRight: 4 }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: 'white' }}>Hoy</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setWeekOffset(w => Math.min(w + 1, 52)); setSelectedDow(todayDow) }}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}
          >
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Calendar Strip — same component as Dashboard + Active Plan */}
      <CalendarStrip
        days={trackingStripDays}
        selectedDow={selectedDow}
        onSelect={setSelectedDow}
        completedCount={weekStats.sessions}
        totalTraining={weekStats.sessions}
      />

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
      >
        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          {selectedDay ? `${DAY_SHORT[selectedDow - 1]} ${selectedDay.dateNum}` : DAY_SHORT[selectedDow - 1] ?? ''} · Actividad del dia
        </Text>

        <TrackingDayCard
          day={selectedDay}
          isToday={isCurrentWeek && selectedDow === todayDow}
          router={router}
        />

        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }}>
          Esta semana
        </Text>

        {/* KPIs */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', padding: 12, ...SHADOW }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Sesiones</Text>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#111827' }}>{weekStats.sessions}</Text>
            <Text style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>esta semana</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', padding: 12, ...SHADOW }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_500Medium', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Tiempo</Text>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#111827' }}>{timeLabel}</Text>
            <Text style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>registrado</Text>
          </View>
        </View>

        {/* Nutrition */}
        {nt && (
          <NutritionProgressCard
            target={{ kcal: nt.kcal, proteinG: nt.proteinG, carbsG: nt.carbsG, fatG: nt.fatG }}
            consumed={dash?.todayFoodTotals ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }}
            onPress={() => router.push('/nutrition' as never)}
          />
        )}

        {/* Body composition */}
        <BodyComposition
          weightKg={dash?.metrics.weightKg ?? null}
          weightGoalKg={dash?.metrics.weightGoalKg ?? null}
          weeklyWeightChange={dash?.weeklyWeightChange ?? null}
        />

        {/* Estado semanal */}
        <EstadoSemana
          checkInData={dash?.checkInData ?? null}
          formStatus={dash?.formStatus ?? null}
          formMessage={dash?.formMessage ?? null}
          lastCheckinDaysAgo={dash?.lastCheckinDaysAgo ?? null}
        />

        {/* Hydration + Meals */}
        <HydrationWidget initialMl={dash?.waterData?.mlLogged} initialTarget={dash?.waterData?.waterMlTarget} />
        <MealSlotsWidget logs={dash?.mealSlotLogs ?? null} />

        {/* CTA */}
        {isB2B ? (
          <View style={{ backgroundColor: '#1e3a5f', borderRadius: 12, padding: 20, ...SHADOW }}>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' }}>Tu coach esta preparando tu plan</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
              Cuando tu entrenador asigne el plan, aparecera aqui automaticamente.
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', padding: 20, gap: 12, ...SHADOW }}>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>Entrena con un plan estructurado</Text>
            <Text style={{ fontSize: 11, color: '#6b7280' }}>Un plan adaptativo ajusta cada sesion a tus metricas semanales.</Text>
            <TouchableOpacity
              onPress={() => router.push('/find-coach' as never)}
              style={{ backgroundColor: '#1e3a5f', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' }}>Buscar entrenador →</Text>
            </TouchableOpacity>
          </View>
        )}

        <CheckInBanner recordedAt={dash?.checkInData?.recordedAt ?? null} />
      </ScrollView>
    </View>
  )
}

// ── TrackingDayCard — gym / freeRun / sport / empty ─────────────────

function TrackingDayCard({
  day, isToday, router,
}: {
  day: CalendarDay | null
  isToday: boolean
  router: ReturnType<typeof useRouter>
}) {
  // Gym
  if (day?.gym) {
    const accentColor = day.gym.done ? '#4ade80' : isToday ? '#ea580c' : '#a855f7'
    return (
      <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', ...SHADOW }}>
        <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 6, backgroundColor: accentColor, alignSelf: 'stretch' }} />
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 22 }}>🏋️</Text>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#111827', flex: 1 }}>{day.gym.label}</Text>
            {isToday && (
              <View style={{ backgroundColor: '#ea580c', borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#fff' }}>HOY</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {day.gym.durationMin != null && (
              <View style={{ backgroundColor: '#f3f4f6', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#374151' }}>{day.gym.durationMin} min</Text>
              </View>
            )}
            <View style={{ backgroundColor: '#faf5ff', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#f3e8ff' }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#7c3aed' }}>💪 Fuerza</Text>
            </View>
            {day.gym.templateName && (
              <View style={{ backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#6b7280' }}>{day.gym.templateName}</Text>
              </View>
            )}
            {day.gym.rpe != null && (
              <View style={{ backgroundColor: '#fff7ed', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#ea580c' }}>RPE {day.gym.rpe}</Text>
              </View>
            )}
          </View>
          {day.gym.done ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' }}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#15803d' }}>Completada</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#f9fafb', paddingTop: 4 }}>
              <TouchableOpacity
                onPress={() => router.push('/gym/session' as never)}
                style={{ flex: 1, backgroundColor: '#ea580c', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' }}>Iniciar sesión de gym →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/gym' as never)}
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#4b5563' }}>Ver rutina</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        </View>
      </View>
    )
  }

  // Free run
  if (day?.freeRun) {
    const icon = SESSION_ICONS[day.freeRun.type] ?? '🏃'
    const name = SESSION_LABELS[day.freeRun.type] ?? 'Sesion libre'
    return (
      <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', ...SHADOW }}>
        <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 6, backgroundColor: '#60a5fa', alignSelf: 'stretch' }} />
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 22 }}>{icon}</Text>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#111827', flex: 1 }}>{name}</Text>
            {isToday && (
              <View style={{ backgroundColor: '#ea580c', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#fff' }}>HOY</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {day.freeRun.durationMin != null && (
              <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#374151' }}>{day.freeRun.durationMin} min</Text>
              </View>
            )}
            {day.freeRun.distanceKm != null && (
              <View style={{ backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#1d4ed8' }}>{day.freeRun.distanceKm} km</Text>
              </View>
            )}
            {day.freeRun.rpe != null && (
              <View style={{ backgroundColor: '#fff7ed', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#ea580c' }}>RPE {day.freeRun.rpe}</Text>
              </View>
            )}
            <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#2563eb' }}>Sesion libre</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' }}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#15803d' }}>Registrada</Text>
          </View>
        </View>
        </View>
      </View>
    )
  }

  // Sport session completed (rare in tracking mode but handle it)
  if (day?.sport?.done) {
    const icon = SESSION_ICONS[day.sport.type] ?? '🏃'
    const name = SESSION_LABELS[day.sport.type] ?? day.sport.type
    return (
      <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', ...SHADOW }}>
        <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 6, backgroundColor: '#4ade80', alignSelf: 'stretch' }} />
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 22 }}>{icon}</Text>
            <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#111827', flex: 1 }}>{name}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {day.sport.logDurationMin != null && (
              <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#374151' }}>{day.sport.logDurationMin} min</Text>
              </View>
            )}
            {day.sport.logRpe != null && (
              <View style={{ backgroundColor: '#fff7ed', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#ea580c' }}>RPE {day.sport.logRpe}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' }}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#15803d' }}>Completada</Text>
          </View>
        </View>
        </View>
      </View>
    )
  }

  // Empty day — no activity → show SesionLibreCard
  return <SesionLibreCard router={router} />
}
