import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDashboard, getWeekSessions, type WeekSession, type DashboardData } from '../../../src/api/dashboard'

import { getNotifications } from '../../../src/api/notifications'
import { useAuthStore } from '../../../src/store/auth'
import SharePreviewModal from '../../../src/components/SharePreviewModal'
import type { ShareCardProps } from '../../../src/components/ShareCard'

import { SESSION_ICONS, SESSION_LABELS } from '../../../src/constants/sessions'
import CoachCard from '../../../src/components/dashboard/CoachCard'
import NutritionProgressCard from '../../../src/components/dashboard/NutritionProgressCard'
import HydrationWidget from '../../../src/components/dashboard/HydrationWidget'
import MealSlotsWidget from '../../../src/components/dashboard/MealSlotsWidget'
import CalendarStrip, { type DayCell } from '../../../src/components/CalendarStrip'
import SelectedDayCard from '../../../src/components/SelectedDayCard'
import SundayShareBanner from '../../../src/components/dashboard/SundayShareBanner'
import RecentActivityCard from '../../../src/components/dashboard/RecentActivityCard'
import QuickSessionFeedback from '../../../src/components/dashboard/QuickSessionFeedback'
import FreeTodayCard from '../../../src/components/dashboard/FreeTodayCard'
import DesbloquearProCard from '../../../src/components/dashboard/DesbloquearProCard'
import FindCoachCard from '../../../src/components/dashboard/FindCoachCard'
import ProMetricsCard from '../../../src/components/dashboard/ProMetricsCard'
import FreeMetricsCard from '../../../src/components/dashboard/FreeMetricsCard'
import TodayLogCard from '../../../src/components/dashboard/TodayLogCard'

const STREAK_MILESTONE_KEY = 'medaliq:streak_milestone_seen'
const STREAK_MILESTONES = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52]

const PHASE_DISPLAY: Record<string, string> = {
  BASE: 'BASE', DESARROLLO: 'DESARROLLO', ESPECIFICO: 'ESPECÍFICO', AFINAMIENTO: 'AFINAMIENTO',
}

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

const DOT_DAY_LETTERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos dias'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate() {
  const d = new Date()
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
}

function getCurrentWeekLabel(): string {
  const now = new Date()
  const dow = now.getDay() === 0 ? 7 : now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (dow - 1))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => `${d.getDate()} ${d.toLocaleDateString('es', { month: 'short' }).replace('.', '')}`
  return `${fmt(mon)} – ${fmt(sun)}`
}

function sessionsToCalendarDays(sessions: WeekSession[], weekOffset: number): DayCell[] {
  const now = new Date()
  const jsDay = now.getDay() === 0 ? 7 : now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (jsDay - 1) + weekOffset * 7)
  const isCurrentWeek = weekOffset === 0
  const todayIdx = isCurrentWeek ? sessions.findIndex(s => s.isToday) : -1

  return sessions.map(s => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + s.dayIndex)
    const hasSession = !!s.type && s.type !== 'DESCANSO'
    const hasGym = !!s.gymLabel && !hasSession
    const isPastUnlogged = isCurrentWeek && hasSession && !s.done && s.dayIndex < todayIdx && !!s.id
    return {
      dow: s.dayIndex,
      letter: DOT_DAY_LETTERS[s.dayIndex],
      dateNum: d.getDate(),
      type: s.type,
      done: s.done,
      isToday: s.isToday,
      canLog: isPastUnlogged,
      gymLabel: hasGym ? s.gymLabel : null,
    }
  })
}


function buildWeekShareProps(weekSessions: WeekSession[], completedCount: number, totalTraining: number): ShareCardProps {
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const now = new Date()
  const dow = now.getDay() === 0 ? 7 : now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - (dow - 1))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const weekStart = `${mon.getDate()} ${months[mon.getMonth()]}`
  const weekEnd = `${sun.getDate()} ${months[sun.getMonth()]} ${sun.getFullYear()}`
  const dayStates = weekSessions.map((s): 0|1|2|3 => {
    if (!s.done) return 0
    if (s.type === 'INTERVALOS' || s.type === 'FUERZA') return 3
    if (s.type === 'TEMPO' || s.type === 'FARTLEK') return 2
    return 1
  })
  return {
    variant: 'weekly',
    weekStart,
    weekEnd,
    dayStates,
    sessionsCompleted: completedCount,
    sessionsTotal: totalTraining,
    date: `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
  }
}

// -- RecoveryCard (matches web TodaySessionMobile RecoveryCard) ----------------
function RecoveryCardMobile({ planName, recoveryDaysLeft, router }: {
  planName: string | null
  recoveryDaysLeft: number | null
  router: ReturnType<typeof useRouter>
}) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
      <View style={{ height: 3, backgroundColor: '#22c55e' }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 18 }}>🏆</Text>
          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#22c55e', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Temporada completada
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 28 }}>🎖️</Text>
          <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
            ¡Completado!
          </Text>
        </View>
        <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
          {planName ?? 'Plan terminado'}
        </Text>
        {recoveryDaysLeft != null && recoveryDaysLeft > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12 }}>⏱</Text>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#15803d' }}>
              Recuperación activa · {recoveryDaysLeft} días restantes
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(app)/(tabs)/progress' as any) }}
          activeOpacity={0.85}
          style={{ backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 }}
        >
          <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_700Bold' }}>Ver resumen de temporada →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function DashboardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()
  const [freeWeekOffset, setFreeWeekOffset] = useState(0)
  const [calendarSelectedIdx, setCalendarSelectedIdx] = useState<number | null>(null)
  const [showStreakModal, setShowStreakModal] = useState(false)
  const [streakShareProps, setStreakShareProps] = useState<ShareCardProps | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const milestoneCheckedRef = useRef(false)
  // SHARE-07: season completed
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [seasonShareProps, setSeasonShareProps] = useState<ShareCardProps | null>(null)
  const [showSeasonShareModal, setShowSeasonShareModal] = useState(false)
  const seasonCheckedRef = useRef(false)
  // SHARE-08: Sunday share
  const [showSundayShare, setShowSundayShare] = useState(false)
  const [sundayShareProps, setSundayShareProps] = useState<ShareCardProps | null>(null)
  const isSunday = new Date().getDay() === 0

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: getNotifications,
    staleTime: 30_000,
  })
  const unreadCount = notifData?.unreadCount ?? 0

  // PERF-02: removed independent nutrition-log-today query — meal slot data now comes from dashboard API

  // Week navigation: fetch week-specific sessions when navigating away from current week
  const [navWeekSessions, setNavWeekSessions] = useState<WeekSession[] | null>(null)
  const [navWeekStats, setNavWeekStats] = useState<{ completedCount: number; totalTraining: number } | null>(null)
  const [navWeekLabel, setNavWeekLabel] = useState<string | null>(null)
  const [navLoading, setNavLoading] = useState(false)

  useEffect(() => {
    if (freeWeekOffset === 0) {
      setNavWeekSessions(null)
      setNavWeekStats(null)
      setNavWeekLabel(null)
      return
    }
    setNavLoading(true)
    getWeekSessions(freeWeekOffset).then(ws => {
      setNavWeekSessions(ws.weekSessions as WeekSession[])
      setNavWeekStats({ completedCount: ws.completedCount, totalTraining: ws.totalTraining })
      setNavWeekLabel(ws.weekLabel ?? null)
    }).catch(() => {
      setNavWeekSessions(null)
      setNavWeekStats(null)
      setNavWeekLabel(null)
    }).finally(() => setNavLoading(false))
  }, [freeWeekOffset])

  // Milestone detection — show once per milestone level
  useEffect(() => {
    if (!data || milestoneCheckedRef.current) return
    const ws = data.weekStreak ?? 0
    if (!STREAK_MILESTONES.includes(ws)) return
    milestoneCheckedRef.current = true

    AsyncStorage.getItem(STREAK_MILESTONE_KEY).then(stored => {
      const lastSeen = parseInt(stored ?? '0') || 0
      if (ws > lastSeen) {
        const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
        const now = new Date()
        setStreakShareProps({
          variant: 'streak',
          streakWeeks: ws,
          streakDays: data.streakDays,
          date: `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
        })
        setShowStreakModal(true)
      }
    }).catch(() => {/* ignore */})
  }, [data])

  function handleDismissStreak() {
    const ws = data?.weekStreak ?? 0
    if (ws > 0) AsyncStorage.setItem(STREAK_MILESTONE_KEY, String(ws)).catch(() => {/* ignore */})
    setShowStreakModal(false)
  }

  // SHARE-07: show season-completed modal once per plan
  useEffect(() => {
    if (!data?.justCompletedPlan || seasonCheckedRef.current) return
    seasonCheckedRef.current = true
    const plan = data.justCompletedPlan
    const key = `medaliq:season_completed_seen:${plan.name}`
    AsyncStorage.getItem(key).then(seen => {
      if (!seen) {
        const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
        const now = new Date()
        setSeasonShareProps({
          variant: 'season',
          seasonNumber: plan.seasonNumber,
          planName: plan.name,
          totalWeeks: plan.totalWeeks,
          totalSessions: plan.totalSessions,
          totalKm: plan.totalKm ?? undefined,
          adherencePct: plan.adherencePct ?? undefined,
          date: `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
        })
        setShowSeasonModal(true)
      }
    }).catch(() => {/* ignore */})
  }, [data])

  function handleDismissSeason() {
    const plan = data?.justCompletedPlan
    if (plan) AsyncStorage.setItem(`medaliq:season_completed_seen:${plan.name}`, '1').catch(() => {/* ignore */})
    setShowSeasonModal(false)
  }

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

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
        <Text style={{ fontSize: 40, marginBottom: 12 }}>{'\u26A0\uFE0F'}</Text>
        <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#1e3a5f', textAlign: 'center' }}>
          No se pudo cargar
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', marginTop: 6, marginBottom: 20 }}>
          Revisa tu conexion e intenta de nuevo.
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
  const isFree = d.mode === 'FREE'
  const modeLabel = isFree ? 'FREE' : d.isB2B ? 'B2B' : 'PRO'
  // dow: 1=Mon … 7=Sun (ISO)
  const todayDow = (() => { const day = new Date().getDay(); return day === 0 ? 7 : day })()

  // Active week data: use navWeekSessions when navigating, fallback to dashboard data
  const activeWeekSessions = freeWeekOffset === 0 || !navWeekSessions ? d.weekSessions : navWeekSessions
  const activeCompletedCount = freeWeekOffset === 0 || !navWeekStats ? d.completedCount : navWeekStats.completedCount
  const activeTotalTraining = freeWeekOffset === 0 || !navWeekStats ? d.totalTraining : navWeekStats.totalTraining

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
      contentContainerStyle={{ paddingBottom: 28, gap: 12 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
      showsVerticalScrollIndicator={false}
    >
      {/* -- Gradient Header ------------------------------------------------ */}
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={{ paddingTop: insets.top + 12, paddingBottom: 6, paddingHorizontal: 20 }}
      >
        {/* TopGroup */}
        <View style={{ gap: 4 }}>
          {/* GreetingRow: greeting + icons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontSize: 22, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.3 }}
            >
              {getGreeting()}!
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {d.streakDays >= 2 ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                  borderWidth: 1, borderColor: 'rgba(249,115,22,0.5)', borderRadius: 10,
                  paddingHorizontal: 7, paddingVertical: 3,
                }}>
                  <Text style={{ fontSize: 11 }}>🔥</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#f97316' }}>{d.streakDays}</Text>
                </View>
              ) : (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
                  paddingHorizontal: 7, paddingVertical: 3,
                }}>
                  <Text style={{ fontSize: 11, opacity: 0.5 }}>🔥</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.3)' }}>{d.streakDays}</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); router.push('/(app)/notifications') }}
                style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={22} color="white" />
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute', top: -2, right: -4,
                    backgroundColor: '#f97316', borderRadius: 8,
                    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 3,
                  }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: 'white' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          {/* UserName */}
          <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.8)' }}>
            {firstName}
          </Text>
        </View>

        {/* DateLabel — centered */}
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 6 }}>
          {formatDate()}
        </Text>

        {/* WeekNav — matches web WeekNavBar variant="dark" */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', marginTop: 6, marginHorizontal: 16,
          backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, height: 40,
        }}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setFreeWeekOffset((w: number) => w - 1); setCalendarSelectedIdx(null) }}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, marginLeft: 2 }}
          >
            <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'white' }}>
            {freeWeekOffset === 0
              ? (d.planData ? `Semana ${d.planData.currentWeek}  ·  ${getCurrentWeekLabel()}` : getCurrentWeekLabel())
              : (navWeekLabel ?? 'Cargando…')}
          </Text>
          {freeWeekOffset !== 0 && (
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setFreeWeekOffset(0); setCalendarSelectedIdx(null) }}
              activeOpacity={0.8}
              style={{ backgroundColor: '#ea580c', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: 4 }}
            >
              <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: 'white' }}>Hoy</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setFreeWeekOffset((w: number) => w + 1); setCalendarSelectedIdx(null) }}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, marginRight: 2 }}
          >
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>

        {/* ============================================================== */}
        {/* FREE MODE — Figma-aligned layout                               */}
        {/* ============================================================== */}
        {isFree && !d.todaySession && (
          <>
            {/* CalendarStrip — before HOY card per Figma */}
            <CalendarStrip
              days={sessionsToCalendarDays(activeWeekSessions, freeWeekOffset)}
              selectedDow={calendarSelectedIdx}
              onSelect={setCalendarSelectedIdx}
              completedCount={activeCompletedCount}
              totalTraining={activeTotalTraining}
            />

            {/* Selected day detail card — matches web MobileSelectedDayCard */}
            {calendarSelectedIdx != null && (() => {
              const ws = activeWeekSessions.find(s => s.dayIndex === calendarSelectedIdx)
              return ws ? (
                <SelectedDayCard
                  session={ws}
                  isToday={ws.isToday}
                  dayLabel={DOT_DAY_LETTERS[calendarSelectedIdx]?.toUpperCase() ?? ''}
                  onLog={() => {
                    if (ws.type === 'FUERZA') {
                      router.push('/(app)/(tabs)/gym')
                    } else if (ws.id) {
                      router.push({ pathname: '/(app)/log', params: { sessionId: ws.id, type: ws.type ?? '', duration: String(ws.durationMin ?? ''), zone: ws.zoneTarget ?? '2' } })
                    } else {
                      router.push('/(app)/log')
                    }
                  }}
                  onViewPlan={() => router.push(ws.type === 'FUERZA' ? '/(app)/(tabs)/gym' : '/(app)/(tabs)/plan')}
                />
              ) : null
            })()}

            {/* HOY card */}
            <FreeTodayCard router={router} />

            {/* SHARE-08: Sunday weekly share */}
            {isSunday && d.completedCount > 0 && (
              <SundayShareBanner
                completedCount={d.completedCount}
                totalTraining={d.totalTraining}
                onPress={() => { setSundayShareProps(buildWeekShareProps(activeWeekSessions, activeCompletedCount, activeTotalTraining)); setShowSundayShare(true) }}
              />
            )}

            {/* Nutricion */}
            {d.nutritionTarget && (
              <NutritionProgressCard
                target={d.nutritionTarget}
                consumed={d.todayFoodTotals ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }}
                onPress={() => router.push('/(app)/(tabs)/nutrition')}
              />
            )}

            {/* Hidratacion */}
            <HydrationWidget initialMl={d.waterData?.mlLogged} initialTarget={d.waterData?.waterMlTarget} />

            {/* Alimentacion */}
            <MealSlotsWidget logs={d.mealSlotLogs ?? null} />

            {/* Metricas — peso */}
            <FreeMetricsCard
              currentWeight={d.metrics.weightKg}
              targetWeight={d.metrics.weightGoalKg}
              weeklyWeightChange={d.weeklyWeightChange}
              weightProgressPct={d.weightProgressPct}
            />

            {/* Registro de hoy */}
            <TodayLogCard initial={d.todayLog ?? null} />

            {/* Actividad reciente */}
            {d.hasEverLogged && (d.recentActivity?.length ?? 0) > 0 && (
              <RecentActivityCard activities={d.recentActivity ?? []} streakDays={d.streakDays} />
            )}

            {/* CTAs */}
            <DesbloquearProCard router={router} />
            <FindCoachCard router={router} />
          </>
        )}

        {/* ============================================================== */}
        {/* NON-FREE or FREE with todaySession — original layout           */}
        {/* ============================================================== */}
        {(!isFree || d.todaySession) && (
          <>
            {/* Calendar Strip — before TodaySession per Figma */}
            {activeWeekSessions.length > 0 && (
              <CalendarStrip
                days={sessionsToCalendarDays(activeWeekSessions, freeWeekOffset)}
                selectedDow={calendarSelectedIdx}
                onSelect={(dow) => {
                  const s = activeWeekSessions.find(ws => ws.dayIndex === dow)
                  const hasSession = s && s.type && s.type !== 'DESCANSO'
                  const todayIdx = activeWeekSessions.findIndex(ws => ws.isToday)
                  const isPastUnlogged = hasSession && !s.done && dow < todayIdx && !!s.id
                  if (isPastUnlogged) {
                    router.push({
                      pathname: '/(app)/log',
                      params: { sessionId: s.id!, type: s.type!, duration: String(s.durationMin ?? ''), zone: s.zoneTarget ?? '2' },
                    })
                    return
                  }
                  // Tap today → reset to today card; tap other day → show SelectedDayCard
                  setCalendarSelectedIdx(s?.isToday ? null : dow)
                }}
                completedCount={activeCompletedCount}
                totalTraining={activeTotalTraining}
              />
            )}

            {/* #4 — Banner: sugerencias de ajuste del coach pendientes */}
            {(d.pendingSuggestionsCount ?? 0) > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(app)/(tabs)/checkin')}
                style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Text style={{ fontSize: 20 }}>{'💡'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1e3a5f' }}>
                        {d.pendingSuggestionsCount === 1
                          ? '1 sugerencia de ajuste pendiente'
                          : `${d.pendingSuggestionsCount} sugerencias de ajuste pendientes`}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>Tu coach propone cambios basados en el check-in</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#93c5fd" />
                </View>
              </TouchableOpacity>
            )}

            {/* Selected day detail card — replaces todaySession card when a day is tapped */}
            {(() => {
              const ws = calendarSelectedIdx != null
                ? activeWeekSessions.find(s => s.dayIndex === calendarSelectedIdx) ?? null
                : null

              // If a non-today day is selected, show SelectedDayCard for that day
              if (ws && !ws.isToday) {
                return (
                  <SelectedDayCard
                    session={ws}
                    isToday={false}
                    dayLabel={DOT_DAY_LETTERS[calendarSelectedIdx!]?.toUpperCase() ?? ''}
                    onLog={() => {
                      if (ws.type === 'FUERZA') {
                        router.push('/(app)/(tabs)/gym')
                      } else if (ws.id) {
                        router.push({ pathname: '/(app)/log', params: { sessionId: ws.id, type: ws.type ?? '', duration: String(ws.durationMin ?? ''), zone: ws.zoneTarget ?? '2' } })
                      } else {
                        router.push('/(app)/log')
                      }
                    }}
                    onViewPlan={() => router.push(ws.type === 'FUERZA' ? '/(app)/(tabs)/gym' : '/(app)/(tabs)/plan')}
                  />
                )
              }

              // Default: show today's session card (or rest/recovery fallback)
              if (d.todaySession) {
                return (
                  <View style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', ...SHADOW }}>
                    <View style={{ height: 3, backgroundColor: '#1e3a5f' }} />
                    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#ea580c', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                          ● HOY
                        </Text>
                        {d.todaySession.completed ? (
                          <View style={{ backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'white' }}>Completada</Text>
                          </View>
                        ) : d.todaySession.zoneTarget && d.todaySession.zoneTarget !== 'N/A' ? (
                          <View style={{ backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#15803d' }}>
                              Zona {d.todaySession.zoneTarget}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 28 }}>{d.todaySession.completed ? '✓' : (SESSION_ICONS[d.todaySession.type] ?? '🏅')}</Text>
                        <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', letterSpacing: -1 }}>
                          {d.todaySession.id === 'gym-today' && d.workoutName
                            ? d.workoutName
                            : `${d.todaySession.durationMin ?? '—'} min`}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                        {SESSION_LABELS[d.todaySession.type] ?? d.todaySession.type.toLowerCase().replace(/_/g, ' ')}
                      </Text>
                      {d.todaySession.detailText ? (
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                          {d.todaySession.detailText}
                        </Text>
                      ) : null}
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                          if (d.todaySession!.completed) {
                            router.push(d.todaySession!.id === 'gym-today' ? '/(app)/(tabs)/gym' : '/(app)/(tabs)/progress' as any)
                          } else if (d.todaySession!.id === 'gym-today') {
                            router.push('/(app)/(tabs)/gym')
                          } else {
                            router.push({
                              pathname: '/(app)/log',
                              params: {
                                sessionId: d.todaySession!.id,
                                type: d.todaySession!.type,
                                duration: String(d.todaySession!.durationMin),
                                zone: d.todaySession!.zoneTarget,
                              },
                            })
                          }
                        }}
                        activeOpacity={0.85}
                        style={{ backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 }}
                      >
                        <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_700Bold' }}>
                          {d.todaySession.completed ? 'Ver resumen →' : d.todaySession.id === 'gym-today' ? 'Ir al Entreno →' : 'Iniciar →'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(app)/(tabs)/progress' as any) }}
                        activeOpacity={0.7}
                        style={{ alignItems: 'center', marginTop: 2 }}
                      >
                        <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#ea580c' }}>
                          + Agregar otra actividad
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              }

              if (d.mode === 'RECOVERY') {
                return (
                  <RecoveryCardMobile
                    planName={d.completedPlanName}
                    recoveryDaysLeft={d.recoveryDaysLeft}
                    router={router}
                  />
                )
              }

              // Rest day fallback
              return (
                <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOW }}>
                  <Text style={{ fontSize: 28 }}>😴</Text>
                  <View>
                    <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>Día de descanso</Text>
                    <Text style={{ fontSize: 13, color: '#6b7280', fontFamily: 'Inter_400Regular', marginTop: 2 }}>Recupera bien hoy</Text>
                  </View>
                </View>
              )
            })()}

            {/* Gym today now handled via todaySession (id='gym-today') from API */}

            {/* Quick feedback — ¿Cómo te sentiste? (Figma: sesión completada) */}
            {d.todaySession?.completed && (
              <QuickSessionFeedback
                sessionType={d.todaySession.type}
                durationMin={d.todaySession.durationMin ?? 0}
                zoneTarget={d.todaySession.zoneTarget}
                logId={d.todaySession.logId ?? null}
              />
            )}

            {/* SHARE-08: Sunday weekly share */}
            {isSunday && d.completedCount > 0 && (
              <SundayShareBanner
                completedCount={d.completedCount}
                totalTraining={d.totalTraining}
                onPress={() => { setSundayShareProps(buildWeekShareProps(activeWeekSessions, activeCompletedCount, activeTotalTraining)); setShowSundayShare(true) }}
              />
            )}

            {/* Nutricion — first card after session (matches web order) */}
            {d.nutritionTarget && (
              <NutritionProgressCard
                target={d.nutritionTarget}
                consumed={d.todayFoodTotals ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }}
                onPress={() => router.push('/(app)/(tabs)/nutrition')}
              />
            )}

            {/* Hidratacion */}
            <HydrationWidget initialMl={d.waterData?.mlLogged} initialTarget={d.waterData?.waterMlTarget} />

            {/* Alimentacion */}
            <MealSlotsWidget logs={d.mealSlotLogs ?? null} />

            {/* Metricas consolidadas */}
            <ProMetricsCard
              formStatus={d.formStatus}
              formMessage={d.formMessage}
              lastCheckIn={d.lastCheckIn}
              formCheckInDaysAgo={d.lastCheckinDaysAgo ?? null}
              currentWeight={d.metrics.weightKg}
              targetWeight={d.metrics.weightGoalKg}
              weeklyWeightChange={d.weeklyWeightChange}
              weightProgressPct={d.weightProgressPct}
              currentVolume={d.currentVolume}
              volumeDeltaPct={d.volumeDeltaPct}
              isRecomp={d.isRecomp}
              raceDays={d.raceDays}
            />

            {/* Registro de hoy */}
            <TodayLogCard initial={d.todayLog ?? null} />

            {/* Actividad reciente */}
            {d.hasEverLogged && (d.recentActivity?.length ?? 0) > 0 && (
              <RecentActivityCard activities={d.recentActivity ?? []} streakDays={d.streakDays} />
            )}

            {/* Coach card (B2B) — after content cards, matches web InfoBannerRow position */}
            {d.coach && (
              <CoachCard
                name={d.coach.name}
                headline={d.coach.headline}
                initial={d.coach.initial}
                onPress={() => router.push('/(app)/messages')}
              />
            )}

            {/* Check-in pendiente */}
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
                    Registra métricas · tu plan se ajusta automáticamente {'\u2192'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>

    {/* ── Streak Milestone Modal ─────────────────────────────────────── */}
    <Modal
      visible={showStreakModal}
      transparent
      animationType="fade"
      onRequestClose={handleDismissStreak}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 28, width: '100%', alignItems: 'center', gap: 16 }}>
          <Text style={{ fontSize: 52 }}>{'\uD83D\uDD25'}</Text>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: '#1e3a5f', textAlign: 'center' }}>
              {streakShareProps?.streakWeeks} semanas seguidas
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center' }}>
              {d.streakDays} días de racha activa. Sigue así — eso es disciplina real.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#fff7ed', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, width: '100%', justifyContent: 'center' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>{d.streakDays}</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>días racha</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#fed7aa' }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#ea580c' }}>{streakShareProps?.streakWeeks}</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#6b7280' }}>semanas</Text>
            </View>
          </View>

          <View style={{ width: '100%', gap: 10 }}>
            <TouchableOpacity
              onPress={() => { setShowShareModal(true) }}
              activeOpacity={0.85}
              style={{ backgroundColor: '#ea580c', borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              <Text style={{ fontSize: 16, color: 'white' }}>{'\u2191'}</Text>
              <Text style={{ color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>Compartir logro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDismissStreak}
              activeOpacity={0.85}
              style={{ backgroundColor: '#f1f5f9', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
            >
              <Text style={{ color: '#6b7280', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* ── Streak Share Preview Modal ─────────────────────────────────── */}
    {streakShareProps && (
      <SharePreviewModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        card={streakShareProps}
        title="Compartir racha"
      />
    )}

    {/* ── Temporada Completada Modal (SHARE-07) ──────────────────────── */}
    <Modal
      visible={showSeasonModal}
      transparent
      animationType="slide"
      onRequestClose={handleDismissSeason}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: '#1a2744', borderRadius: 24, padding: 28, width: '100%', alignItems: 'center', gap: 18 }}>
          <Text style={{ fontSize: 52 }}>{'\uD83C\uDFC6'}</Text>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#FFCC37', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Temporada {seasonShareProps?.seasonNumber ?? 1} completada
            </Text>
            <Text style={{ fontSize: 24, fontFamily: 'Inter_900Black', color: 'white', textAlign: 'center' }}>
              {seasonShareProps?.planName ?? 'Plan completado'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', width: '100%', gap: 0 }}>
            {seasonShareProps?.totalWeeks != null && (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#FFCC37' }}>{seasonShareProps.totalWeeks}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' }}>semanas</Text>
              </View>
            )}
            {(seasonShareProps?.totalSessions ?? 0) > 0 && (
              <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' }}>
                <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#FFCC37' }}>{seasonShareProps?.totalSessions}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' }}>sesiones</Text>
              </View>
            )}
            {seasonShareProps?.totalKm != null && (
              <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' }}>
                <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#FFCC37' }}>{seasonShareProps.totalKm}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' }}>km totales</Text>
              </View>
            )}
            {seasonShareProps?.adherencePct != null && (
              <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' }}>
                <Text style={{ fontSize: 26, fontFamily: 'Inter_900Black', color: '#FFCC37' }}>{seasonShareProps.adherencePct}%</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)' }}>adherencia</Text>
              </View>
            )}
          </View>

          <View style={{ width: '100%', gap: 10 }}>
            <TouchableOpacity
              onPress={() => setShowSeasonShareModal(true)}
              activeOpacity={0.85}
              style={{ backgroundColor: '#ea580c', borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              <Text style={{ fontSize: 16, color: 'white' }}>{'\u2191'}</Text>
              <Text style={{ color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' }}>Compartir temporada</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDismissSeason}
              activeOpacity={0.85}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {seasonShareProps && (
      <SharePreviewModal
        visible={showSeasonShareModal}
        onClose={() => setShowSeasonShareModal(false)}
        card={seasonShareProps}
        title="Compartir temporada"
      />
    )}

    {/* ── Sunday Weekly Share Modal (SHARE-08) ───────────────────────── */}
    {sundayShareProps && (
      <SharePreviewModal
        visible={showSundayShare}
        onClose={() => setShowSundayShare(false)}
        card={sundayShareProps}
        title="Compartir semana"
      />
    )}
    </>
  )
}
