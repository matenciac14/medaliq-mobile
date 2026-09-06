import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { getGroceryList, type GroceryItem } from '../../src/api/nutrition'

function getMondayOfCurrentWeek(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff))
  return monday.toISOString().slice(0, 10)
}

const CATEGORY_EMOJI: Record<string, string> = {
  PROTEIN:   '🥩',
  CARB:      '🍞',
  FAT:       '🥑',
  VEGETABLE: '🥦',
  FRUIT:     '🍎',
  DAIRY:     '🥛',
  LEGUME:    '🫘',
  NUT_SEED:  '🌰',
  OTHER:     '🛒',
}

function buildShareText(
  weekStart: string,
  weekEnd: string,
  categories: { category: string; label: string; items: GroceryItem[] }[],
  checked: Set<string>
): string {
  const lines: string[] = [`Lista del mercado — ${weekStart} al ${weekEnd}`, '']
  for (const group of categories) {
    const pending = group.items.filter(item => !checked.has(`${group.category}::${item.name}`))
    if (pending.length === 0) continue
    lines.push(`${CATEGORY_EMOJI[group.category] ?? '•'} ${group.label.toUpperCase()}`)
    for (const item of pending) {
      lines.push(`  • ${item.name} (${item.totalG}g aprox.)`)
    }
    lines.push('')
  }
  lines.push('Generado con Medaliq')
  return lines.join('\n')
}

export default function GroceryListScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const weekStart = getMondayOfCurrentWeek()
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['grocery-list', weekStart],
    queryFn:  () => getGroceryList(weekStart),
    staleTime: 5 * 60_000,
  })

  function toggleItem(key: string) {
    Haptics.selectionAsync()
    setChecked(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleShare() {
    if (!data) return
    const text = buildShareText(data.weekStart, data.weekEnd, data.categories, checked)
    try {
      await Share.share({ message: text })
    } catch {
      Alert.alert('Error', 'No se pudo compartir la lista.')
    }
  }

  const pendingCount = data
    ? data.categories.reduce((acc, g) => acc + g.items.filter(i => !checked.has(`${g.category}::${i.name}`)).length, 0)
    : 0

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>

      {/* Header */}
      <View style={{
        backgroundColor: '#1e3a5f',
        paddingTop: insets.top + 16,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 24 }}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: 'white', fontSize: 22, fontFamily: 'Inter_900Black', letterSpacing: -0.5 }}>
              Lista del mercado
            </Text>
            {data && (
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                {data.totalItems} alimentos · semana del {data.weekStart}
              </Text>
            )}
          </View>
        </View>

        {/* Share button */}
        {data && data.totalItems > 0 && (
          <TouchableOpacity
            onPress={handleShare}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 7,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 14 }}>↗</Text>
            <Text style={{ color: 'white', fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
              Compartir
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#f97316" size="large" />
          <Text style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 12 }}>
            Armando tu lista...
          </Text>
        </View>
      )}

      {isError && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>⚠️</Text>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
            No se pudo cargar la lista
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 8 }}>
            <Text style={{ color: '#f97316', fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && data && data.totalItems === 0 && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🛒</Text>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
            No hay comidas planificadas esta semana
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#6b7280', textAlign: 'center', lineHeight: 20 }}>
            Cuando el coach asigne un plan de comidas o armes tu menú semanal, aquí aparecerá la lista de compras automáticamente.
          </Text>
        </View>
      )}

      {!isLoading && !isError && data && data.totalItems > 0 && (
        <>
          {/* Progress bar */}
          {checked.size > 0 && (
            <View style={{ backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#111827' }}>
                  {pendingCount === 0 ? '¡Lista completa! 🎉' : `Faltan ${pendingCount} ítems`}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                  {checked.size} de {data.totalItems}
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: pendingCount === 0 ? '#22c55e' : '#f97316',
                    width: `${(checked.size / data.totalItems) * 100}%`,
                  }}
                />
              </View>
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {data.categories.map((group) => (
              <View
                key={group.category}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  overflow: 'hidden',
                }}
              >
                {/* Category header */}
                <View style={{
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <Text style={{ fontSize: 18 }}>{CATEGORY_EMOJI[group.category] ?? '🛒'}</Text>
                  <Text style={{
                    fontSize: 11,
                    fontFamily: 'Inter_700Bold',
                    color: '#6b7280',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    flex: 1,
                  }}>
                    {group.label}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#d1d5db' }}>
                    {group.items.filter(i => !checked.has(`${group.category}::${i.name}`)).length}/{group.items.length}
                  </Text>
                </View>

                {/* Items */}
                {group.items.map((item, idx) => {
                  const key = `${group.category}::${item.name}`
                  const isChecked = checked.has(key)
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => toggleItem(key)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 20,
                        paddingVertical: 13,
                        borderTopWidth: idx > 0 ? 1 : 0,
                        borderTopColor: '#f9fafb',
                        backgroundColor: isChecked ? '#f8fafc' : 'white',
                      }}
                    >
                      {/* Checkbox */}
                      <View style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: isChecked ? '#22c55e' : '#d1d5db',
                        backgroundColor: isChecked ? '#22c55e' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                        flexShrink: 0,
                      }}>
                        {isChecked && (
                          <Text style={{ color: 'white', fontSize: 13, fontFamily: 'Inter_700Bold', lineHeight: 15 }}>✓</Text>
                        )}
                      </View>

                      {/* Name + grams */}
                      <Text style={{
                        flex: 1,
                        fontSize: 14,
                        fontFamily: 'Inter_500Medium',
                        color: isChecked ? '#9ca3af' : '#111827',
                        textDecorationLine: isChecked ? 'line-through' : 'none',
                      }}>
                        {item.name}
                      </Text>
                      <Text style={{
                        fontSize: 12,
                        fontFamily: 'Inter_400Regular',
                        color: isChecked ? '#d1d5db' : '#9ca3af',
                        marginLeft: 8,
                      }}>
                        ~{item.totalG}g
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}

            {/* Clear checked button */}
            {checked.size > 0 && (
              <TouchableOpacity
                onPress={() => setChecked(new Set())}
                style={{ alignItems: 'center', paddingVertical: 14 }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#9ca3af' }}>
                  Desmarcar todo
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </>
      )}
    </View>
  )
}
