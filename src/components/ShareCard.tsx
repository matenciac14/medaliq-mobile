import React from 'react'
import { View, Text, StyleSheet, ImageBackground } from 'react-native'
import { CARD_W, CARD_H } from '../lib/share'

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  navy:    '#1a2744',
  navyDk:  '#101828',
  navyXdk: '#0F1720',
  warmDk:  '#231A0D',
  orange:  '#ea580c',
  gold:    '#FFCC37',
  white:   '#ffffff',
  green:   '#22c35d',
} as const

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type ShareVariant = 'pr_gym' | 'session' | 'streak' | 'season' | 'weekly'

export interface ShareCardProps {
  variant: ShareVariant
  backgroundMode?: 'solid' | 'transparent'
  backgroundImageUri?: string   // solo para transparent mode
  date?: string                 // ej. "24 ago 2026"

  // PR de Fuerza
  exerciseName?: string         // "PRESS DE BANCA"
  weightKg?: number             // 102.5
  estimatedOneRM?: number       // calculado con Epley
  weeksProgress?: number        // 8

  // Sesión Completada
  sessionType?: 'FUERZA' | 'RUNNING'
  durationMin?: number          // 45
  exerciseCount?: number        // 12
  totalLoadKg?: number          // 4200
  rpe?: number                  // 7
  planName?: string             // "Plan Base 12 sem"
  distanceKm?: number           // solo RUNNING
  avgPaceSecPerKm?: number      // solo RUNNING — calculado como (durationMin*60)/distanceKm

  // Racha Semanal
  streakWeeks?: number          // 12
  streakDays?: number           // 84 — días consecutivos de actividad

  // Temporada Completada
  seasonNumber?: number         // 1
  totalWeeks?: number           // 12
  totalSessions?: number        // 48
  totalKm?: number              // 340
  adherencePct?: number         // 95

  // Resumen Semanal
  weekStart?: string            // "18 ago"
  weekEnd?: string              // "24 ago 2026"
  dayStates?: (0 | 1 | 2 | 3)[]  // [3,0,2,3,1,2,0] — 7 valores
  sessionsCompleted?: number
  sessionsTotal?: number
  motivationalText?: string
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function TopBar({ date }: { date?: string }) {
  return (
    <View style={s.topBar}>
      <Text style={s.brand}>MedalIQ</Text>
      {date ? <Text style={s.dateText}>{date}</Text> : null}
    </View>
  )
}

function Footer({ color = C.orange }: { color?: string }) {
  return (
    <View style={s.footer}>
      <View style={[s.divider, { backgroundColor: color, opacity: 0.2 }]} />
      <Text style={[s.footerText, { color }]}>medaliq.com</Text>
    </View>
  )
}

function Pill({
  label,
  bg = C.orange,
  textColor = C.white,
}: {
  label: string
  bg?: string
  textColor?: string
}) {
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={[s.pillText, { color: textColor }]}>{label}</Text>
    </View>
  )
}

// ── Variante 1 — PR de Fuerza ─────────────────────────────────────────────────
function PRGymCard(p: ShareCardProps) {
  const weight = p.weightKg != null ? `${p.weightKg} kg` : '— kg'
  const exercise = p.exerciseName?.toUpperCase() ?? 'EJERCICIO'
  const sub = p.estimatedOneRM
    ? `1RM estimado · ${p.weeksProgress ? `${p.weeksProgress} sem de progreso` : 'récord personal'}`
    : p.weeksProgress
    ? `${p.weeksProgress} semanas de progreso`
    : 'Récord personal'

  return (
    <View style={[s.card, { backgroundColor: C.navy }]}>
      <TopBar date={p.date} />
      <View style={s.centerContent}>
        <Text style={s.heroEmoji}>🏆</Text>
        <Pill label="NUEVO RÉCORD PERSONAL" />
        <Text style={[s.exerciseName, { letterSpacing: 1 }]}>{exercise}</Text>
        <Text style={[s.heroNumber, { color: C.orange }]}>{weight}</Text>
        <Text style={s.subtext}>{sub}</Text>
      </View>
      <Footer />
    </View>
  )
}

// ── Variante 2 — Sesión Completada ────────────────────────────────────────────
function SessionCard(p: ShareCardProps) {
  const isRunning = p.sessionType === 'RUNNING'
  const duration = p.durationMin != null ? `${p.durationMin} min` : '— min'
  const stat1 = isRunning
    ? { val: p.distanceKm != null ? `${p.distanceKm} km` : '—', label: 'distancia' }
    : { val: p.exerciseCount != null ? `${p.exerciseCount}` : '—', label: 'ejercicios' }
  const stat2 = isRunning
    ? {
        val: p.avgPaceSecPerKm != null
          ? `${Math.floor(p.avgPaceSecPerKm / 60)}:${String(p.avgPaceSecPerKm % 60).padStart(2, '0')}`
          : '—',
        label: 'min/km',
      }
    : { val: p.totalLoadKg != null ? `${(p.totalLoadKg / 1000).toFixed(1)}t` : '—', label: 'carga total' }
  const stat3 = { val: p.rpe != null ? `RPE ${p.rpe}` : '—', label: 'esfuerzo' }

  return (
    <View style={[s.card, { backgroundColor: C.navyDk }]}>
      <View style={s.topBar}>
        <Text style={s.brand}>MedalIQ</Text>
        <Pill
          label={p.sessionType ?? 'FUERZA'}
          bg={`${C.orange}33`}
          textColor={C.orange}
        />
      </View>
      <View style={s.centerContent}>
        <View style={[s.pill, { backgroundColor: `${C.green}22` }]}>
          <Text style={[s.pillText, { color: C.green }]}>✓  Sesión Completada</Text>
        </View>
        <Text style={[s.heroNumber, { color: C.white, fontSize: 72 }]}>{duration}</Text>
        <View style={s.statsRow}>
          <StatCell {...stat1} />
          <View style={s.statSep} />
          <StatCell {...stat2} />
          <View style={s.statSep} />
          <StatCell {...stat3} />
        </View>
        {p.planName ? (
          <Text style={s.subtext}>{p.planName}</Text>
        ) : null}
      </View>
      <Footer />
    </View>
  )
}

function StatCell({ val, label }: { val: string; label: string }) {
  return (
    <View style={s.statCell}>
      <Text style={s.statVal}>{val}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

// ── Variante 3 — Racha Semanal ────────────────────────────────────────────────
function StreakCard(p: ShareCardProps) {
  const weeks = p.streakWeeks ?? 0
  const days = p.streakDays
  const dotsRows = Math.ceil(weeks / 4)

  return (
    <View style={[s.card, { backgroundColor: C.warmDk, overflow: 'hidden' }]}>
      {/* Glow orb background */}
      <View style={s.glowOrb} />
      <TopBar date={p.date} />
      <View style={s.centerContent}>
        <Text style={s.heroEmoji}>🔥</Text>
        <Text style={[s.heroNumber, { color: C.orange, fontSize: 96, lineHeight: 96 }]}>
          {weeks}
        </Text>
        <Text style={[s.exerciseName, { letterSpacing: 10, fontSize: 16 }]}>SEMANAS</Text>
        {days != null ? (
          <Text style={s.subtext}>{days} días de racha activa</Text>
        ) : (
          <Text style={s.subtext}>Consecutivas sin fallar</Text>
        )}
        <View style={s.dotsGrid}>
          {Array.from({ length: dotsRows }, (_, r) => (
            <View key={r} style={s.dotsRow}>
              {Array.from({ length: Math.min(4, weeks - r * 4) }, (_, c) => (
                <View key={c} style={s.dot} />
              ))}
            </View>
          ))}
        </View>
      </View>
      <Footer />
    </View>
  )
}

// ── Variante 4 — Temporada Completada ────────────────────────────────────────
function SeasonCard(p: ShareCardProps) {
  const season = p.seasonNumber ?? 1

  return (
    <View style={[s.card, { backgroundColor: C.navyXdk }]}>
      <View style={s.topBar}>
        <Text style={s.brand}>MedalIQ</Text>
        <Pill
          label={`TEMPORADA ${season}`}
          bg={`${C.gold}22`}
          textColor={C.gold}
        />
      </View>
      <View style={s.centerContent}>
        <Text style={s.heroEmoji}>🏅</Text>
        <Text style={[s.heroNumber, { color: C.white, fontSize: 40, letterSpacing: 3 }]}>
          COMPLETADA
        </Text>
        {p.planName ? (
          <Text style={s.subtext}>{p.planName}</Text>
        ) : null}
        <View style={[s.divider, { backgroundColor: C.gold, opacity: 0.25, marginVertical: 20 }]} />
        <View style={s.seasonGrid}>
          <SeasonStat val={`${p.totalWeeks ?? '—'}`} label="semanas" color={C.gold} />
          <SeasonStat val={`${p.totalSessions ?? '—'}`} label="sesiones" color={C.gold} />
          <SeasonStat
            val={p.totalKm != null ? `${p.totalKm} km` : '—'}
            label="corridos"
            color={C.gold}
          />
          <SeasonStat
            val={p.adherencePct != null ? `${p.adherencePct}%` : '—'}
            label="adherencia"
            color={C.gold}
          />
        </View>
      </View>
      <Footer color={C.gold} />
    </View>
  )
}

function SeasonStat({ val, label, color }: { val: string; label: string; color: string }) {
  return (
    <View style={s.seasonStatCell}>
      <Text style={[s.statVal, { color, fontSize: 26 }]}>{val}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

// ── Variante 5 — Resumen Semanal ──────────────────────────────────────────────
const DAY_DOT_COLORS = [
  'rgba(255,255,255,0.12)',  // 0 = sin actividad
  `${C.orange}60`,           // 1 = leve
  `${C.orange}AA`,           // 2 = moderado
  C.orange,                  // 3 = intenso
] as const

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function WeeklyCard(p: ShareCardProps) {
  const states = p.dayStates ?? [0, 0, 0, 0, 0, 0, 0]
  const completed = p.sessionsCompleted ?? 0
  const total = p.sessionsTotal ?? 0

  return (
    <View style={[s.card, { backgroundColor: C.navy }]}>
      <View style={s.topBar}>
        <Text style={s.brand}>MedalIQ</Text>
        <Text style={[s.pillText, { color: C.orange, letterSpacing: 4 }]}>MI SEMANA</Text>
      </View>
      <View style={s.centerContent}>
        {p.weekStart && p.weekEnd ? (
          <Text style={[s.exerciseName, { fontSize: 17, letterSpacing: 0.5, opacity: 0.85 }]}>
            {p.weekStart} – {p.weekEnd}
          </Text>
        ) : null}

        {/* 7-day activity grid */}
        <View style={s.weekGrid}>
          <View style={s.dotsRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={s.dayLabel}>{d}</Text>
            ))}
          </View>
          <View style={s.dotsRow}>
            {states.map((state, i) => (
              <View
                key={i}
                style={[s.weekSquare, { backgroundColor: DAY_DOT_COLORS[state] }]}
              />
            ))}
          </View>
        </View>

        {/* 3 metric boxes */}
        <View style={s.statsRow}>
          <MiniStat val={`${completed}/${total}`} label="sesiones" />
          <View style={s.statSep} />
          <MiniStat
            val={p.adherencePct != null ? `${p.adherencePct}%` : '—'}
            label="adherencia"
          />
          <View style={s.statSep} />
          <MiniStat val={p.rpe != null ? `RPE ${p.rpe}` : '—'} label="prom." />
        </View>

        {p.motivationalText ? (
          <Text style={[s.subtext, { color: C.orange, opacity: 0.85 }]}>
            {p.motivationalText}
          </Text>
        ) : null}
      </View>
      <Footer />
    </View>
  )
}

function MiniStat({ val, label }: { val: string; label: string }) {
  return (
    <View style={s.miniStatCell}>
      <Text style={s.statVal}>{val}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

// ── Variante 6 — Transparent (glass overlay) ──────────────────────────────────
function TransparentCard(p: ShareCardProps) {
  const inner = { ...p, backgroundMode: 'solid' as const }

  const content = (
    <View style={s.glassOverlay}>
      <View style={s.glassCard}>
        <TopBar date={p.date} />
        <View style={[s.divider, { backgroundColor: C.white, opacity: 0.12, marginVertical: 12 }]} />
        <View style={s.centerContent}>
          <Text style={s.heroEmoji}>🏆</Text>
          <Pill label="NUEVO RÉCORD" />
          <Text style={[s.exerciseName, { letterSpacing: 1 }]}>
            {p.exerciseName?.toUpperCase() ?? 'EJERCICIO'}
          </Text>
          <Text style={[s.heroNumber, { color: C.orange }]}>
            {p.weightKg != null ? `${p.weightKg} kg` : '— kg'}
          </Text>
          <Text style={s.subtext}>
            {p.estimatedOneRM ? '1RM estimado' : 'Récord personal'}
            {p.weeksProgress ? ` · ${p.weeksProgress} sem` : ''}
          </Text>
        </View>
        <Footer />
      </View>
    </View>
  )

  if (p.backgroundImageUri) {
    return (
      <ImageBackground
        source={{ uri: p.backgroundImageUri }}
        style={[s.card, { justifyContent: 'center' }]}
        resizeMode="cover"
      >
        {content}
      </ImageBackground>
    )
  }

  // Sin foto: fondo oscuro simulado
  return (
    <View style={[s.card, { backgroundColor: '#1C1510', justifyContent: 'center' }]}>
      {content}
    </View>
  )
}

// ── Main ShareCard ─────────────────────────────────────────────────────────────
export default function ShareCard(props: ShareCardProps) {
  if (props.backgroundMode === 'transparent') {
    return <TransparentCard {...props} />
  }

  switch (props.variant) {
    case 'pr_gym':  return <PRGymCard {...props} />
    case 'session': return <SessionCard {...props} />
    case 'streak':  return <StreakCard {...props} />
    case 'season':  return <SeasonCard {...props} />
    case 'weekly':  return <WeeklyCard {...props} />
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: C.white,
    opacity: 0.9,
  },
  dateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: C.white,
    opacity: 0.4,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  heroEmoji: {
    fontSize: 52,
    lineHeight: 64,
  },
  heroNumber: {
    fontFamily: 'Inter_700Bold',
    fontSize: 64,
    color: C.orange,
    textAlign: 'center',
    lineHeight: 72,
  },
  exerciseName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: C.white,
    textAlign: 'center',
  },
  subtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: C.white,
    opacity: 0.5,
    textAlign: 'center',
  },
  pill: {
    backgroundColor: C.orange,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  pillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: C.white,
    letterSpacing: 1.5,
  },
  footer: {
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: C.white,
    opacity: 0.12,
  },
  footerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    opacity: 0.75,
  },
  // Stats row (shared by Session + Weekly)
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statVal: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: C.white,
    textAlign: 'center',
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: C.white,
    opacity: 0.45,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statSep: {
    width: 1,
    height: 40,
    backgroundColor: C.white,
    opacity: 0.12,
  },
  // Streak dots
  glowOrb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: C.orange,
    opacity: 0.08,
    top: -80,
    alignSelf: 'center',
  },
  dotsGrid: {
    gap: 8,
    marginTop: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.orange,
    opacity: 0.85,
  },
  // Season grid
  seasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
  },
  seasonStatCell: {
    alignItems: 'center',
    gap: 4,
    minWidth: 100,
  },
  // Weekly grid
  weekGrid: {
    gap: 8,
    alignItems: 'center',
  },
  dayLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: C.white,
    opacity: 0.35,
    width: 36,
    textAlign: 'center',
  },
  weekSquare: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  miniStatCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  // Transparent / glass card
  glassOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(26,39,68,0.82)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 28,
    paddingVertical: 28,
    gap: 12,
  },
})
