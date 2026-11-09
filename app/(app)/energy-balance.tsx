import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { getEnergyBalance, type EnergyBalanceData } from '../../src/api/nutrition'

// ── Helpers ──────────────────────────────────────────────────────────────────

function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string
  current: number
  target: number
  color: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const over = current > target && target > 0

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabelRow}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={[styles.macroValues, over && { color: '#ef4444' }]}>
          {current}g <Text style={styles.macroTarget}>/ {target}g</Text>
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${pct}%` as any,
              backgroundColor: over ? '#ef4444' : color,
            },
          ]}
        />
      </View>
    </View>
  )
}

function SkeletonBlock({ height, width = '100%', style }: { height: number; width?: string | number; style?: object }) {
  return (
    <View
      style={[
        {
          height,
          width: width as any,
          backgroundColor: '#e5e7eb',
          borderRadius: 10,
        },
        style,
      ]}
    />
  )
}

function LoadingSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <SkeletonBlock height={120} style={{ borderRadius: 20, marginBottom: 16 }} />
      <SkeletonBlock height={100} style={{ borderRadius: 20, marginBottom: 12 }} />
      <SkeletonBlock height={80} style={{ borderRadius: 20, marginBottom: 12 }} />
      <SkeletonBlock height={72} style={{ borderRadius: 20, marginBottom: 12 }} />
      <SkeletonBlock height={72} style={{ borderRadius: 20 }} />
    </View>
  )
}

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'stable' | null }) {
  if (!trend || trend === 'stable') {
    return <Text style={styles.trendStable}>→</Text>
  }
  if (trend === 'up') {
    return <Text style={styles.trendUp}>↑</Text>
  }
  return <Text style={styles.trendDown}>↓</Text>
}

// ── Sections ─────────────────────────────────────────────────────────────────

function CalorieSummaryCard({ data }: { data: EnergyBalanceData }) {
  const isPositive = data.balance >= 0
  const balanceColor = isPositive ? '#16a34a' : '#f97316'

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>BALANCE DEL DIA</Text>
      <View style={styles.calorieRow}>
        <View style={styles.calorieItem}>
          <Text style={styles.calorieValue}>{data.totalBudget}</Text>
          <Text style={styles.calorieCaption}>Presupuesto</Text>
        </View>
        <View style={styles.calorieDivider} />
        <View style={styles.calorieItem}>
          <Text style={styles.calorieValue}>{data.consumed}</Text>
          <Text style={styles.calorieCaption}>Consumido</Text>
        </View>
        <View style={styles.calorieDivider} />
        <View style={styles.calorieItem}>
          <Text style={[styles.calorieValueLarge, { color: balanceColor }]}>
            {isPositive ? '+' : ''}{data.balance}
          </Text>
          <Text style={styles.calorieCaption}>Balance</Text>
        </View>
      </View>

      {data.exerciseCalories > 0 && (
        <View style={styles.exercisePill}>
          <Text style={styles.exercisePillText}>
            + {data.exerciseCalories} kcal ejercicio · TDEE base {data.tdeeBase} kcal
          </Text>
        </View>
      )}
    </View>
  )
}

function MacrosCard({ macros }: { macros: EnergyBalanceData['macros'] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>MACRONUTRIENTES</Text>
      <View style={styles.macrosContainer}>
        <MacroBar label="Proteina" current={macros.protein.current} target={macros.protein.target} color="#3b82f6" />
        <MacroBar label="Carbohidratos" current={macros.carbs.current} target={macros.carbs.target} color="#f59e0b" />
        <MacroBar label="Grasas" current={macros.fat.current} target={macros.fat.target} color="#8b5cf6" />
      </View>
    </View>
  )
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  GYM: 'Gym',
  RUNNING: 'Running',
  CYCLING: 'Ciclismo',
  SWIMMING: 'Natacion',
  HIIT: 'HIIT',
  YOGA: 'Yoga',
  OTHER: 'Entrenamiento',
}

function SessionCard({ session }: { session: NonNullable<EnergyBalanceData['todaySession']> }) {
  if (!session.completed) return null

  const typeLabel = session.type ? (SESSION_TYPE_LABELS[session.type] ?? session.type) : 'Entrenamiento'

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>SESION DE HOY</Text>
      <View style={styles.sessionRow}>
        <View style={styles.sessionIcon}>
          <Text style={styles.sessionEmoji}>🏋️</Text>
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionType}>{typeLabel}</Text>
          {session.durationMin != null && (
            <Text style={styles.sessionDetail}>{session.durationMin} min</Text>
          )}
        </View>
        {session.caloriesBurned != null && (
          <View style={styles.sessionCalPill}>
            <Text style={styles.sessionCalText}>~{session.caloriesBurned} kcal</Text>
          </View>
        )}
      </View>
    </View>
  )
}

function WaterCard({ water }: { water: EnergyBalanceData['water'] }) {
  const pct = water.mlTarget > 0
    ? Math.min(100, Math.round((water.mlLogged / water.mlTarget) * 100))
    : 0
  const liters = (water.mlLogged / 1000).toFixed(1)
  const targetL = (water.mlTarget / 1000).toFixed(1)
  const reached = water.mlLogged >= water.mlTarget

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>HIDRATACION</Text>
      <View style={styles.waterRow}>
        <Text style={styles.waterEmoji}>💧</Text>
        <View style={styles.waterInfo}>
          <View style={styles.waterValueRow}>
            <Text style={[styles.waterValue, reached && { color: '#16a34a' }]}>{liters}</Text>
            <Text style={styles.waterTarget}> / {targetL} L</Text>
          </View>
          <View style={styles.waterBarTrack}>
            <View
              style={[
                styles.waterBarFill,
                {
                  width: `${pct}%` as any,
                  backgroundColor: reached ? '#22c55e' : '#3b82f6',
                },
              ]}
            />
          </View>
        </View>
        <View style={[styles.waterPctPill, reached && styles.waterPctPillDone]}>
          <Text style={[styles.waterPctText, reached && { color: '#16a34a' }]}>{pct}%</Text>
        </View>
      </View>
    </View>
  )
}

function WeightCard({ weight }: { weight: EnergyBalanceData['weight'] }) {
  if (weight.current == null) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>PESO</Text>
        <Text style={styles.emptyText}>Sin registro de peso esta semana</Text>
      </View>
    )
  }

  const change = weight.weeklyChange
  const changeColor = change == null ? '#9ca3af' : change < 0 ? '#16a34a' : change > 0 ? '#f97316' : '#6b7280'

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>PESO</Text>
      <View style={styles.weightRow}>
        <View style={styles.weightMain}>
          <Text style={styles.weightValue}>{weight.current.toFixed(1)}</Text>
          <Text style={styles.weightUnit}>kg</Text>
          <TrendArrow trend={weight.trend} />
        </View>
        <View style={styles.weightStats}>
          {weight.previous != null && (
            <View style={styles.weightStatItem}>
              <Text style={styles.weightStatLabel}>Anterior</Text>
              <Text style={styles.weightStatValue}>{weight.previous.toFixed(1)} kg</Text>
            </View>
          )}
          {change != null && (
            <View style={styles.weightStatItem}>
              <Text style={styles.weightStatLabel}>Cambio semanal</Text>
              <Text style={[styles.weightStatValue, { color: changeColor }]}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)} kg
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EnergyBalanceScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['energy-balance'],
    queryFn: getEnergyBalance,
    staleTime: 30_000,
  })

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e3a5f', '#2d5a8e']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync()
            router.back()
          }}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>Balance Energetico</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </LinearGradient>

      {isLoading ? (
        <LoadingSkeleton />
      ) : !data ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar el balance energetico.</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />
          }
        >
          <CalorieSummaryCard data={data} />
          <MacrosCard macros={data.macros} />
          {data.todaySession?.completed && <SessionCard session={data.todaySession} />}
          <WaterCard water={data.water} />
          <WeightCard weight={data.weight} />
        </ScrollView>
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  backBtn: {
    paddingBottom: 2,
  },
  backIcon: {
    fontSize: 28,
    color: 'white',
    lineHeight: 32,
  },
  headerTitle: {
    flex: 1,
  },
  headerText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  headerDate: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  skeletonContainer: {
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  // Card
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#8c99a6',
    letterSpacing: 0.72,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 8,
  },
  // Calorie summary
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calorieItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  calorieDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#e5e7eb',
  },
  calorieValue: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#111827',
    letterSpacing: -0.5,
  },
  calorieValueLarge: {
    fontSize: 24,
    fontFamily: 'Inter_900Black',
    letterSpacing: -0.5,
  },
  calorieCaption: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
  },
  exercisePill: {
    backgroundColor: '#fff7ed',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  exercisePillText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#ea580c',
    textAlign: 'center',
  },
  // Macros
  macrosContainer: {
    gap: 12,
  },
  macroRow: {
    gap: 6,
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#374151',
  },
  macroValues: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#111827',
  },
  macroTarget: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
  },
  barTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Session
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionEmoji: {
    fontSize: 20,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionType: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#111827',
  },
  sessionDetail: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
    marginTop: 2,
  },
  sessionCalPill: {
    backgroundColor: '#fff2e5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sessionCalText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#ea580c',
  },
  // Water
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waterEmoji: {
    fontSize: 24,
  },
  waterInfo: {
    flex: 1,
    gap: 6,
  },
  waterValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  waterValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#3b82f6',
  },
  waterTarget: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
  },
  waterBarTrack: {
    height: 6,
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    overflow: 'hidden',
  },
  waterBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  waterPctPill: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 44,
    alignItems: 'center',
  },
  waterPctPillDone: {
    backgroundColor: '#dcfce7',
  },
  waterPctText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#3b82f6',
  },
  // Weight
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  weightMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  weightValue: {
    fontSize: 32,
    fontFamily: 'Inter_900Black',
    color: '#111827',
    letterSpacing: -1,
  },
  weightUnit: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
  },
  trendUp: {
    fontSize: 20,
    color: '#f97316',
  },
  trendDown: {
    fontSize: 20,
    color: '#16a34a',
  },
  trendStable: {
    fontSize: 20,
    color: '#6b7280',
  },
  weightStats: {
    flex: 1,
    gap: 8,
  },
  weightStatItem: {
    gap: 2,
  },
  weightStatLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
  },
  weightStatValue: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#374151',
  },
})
