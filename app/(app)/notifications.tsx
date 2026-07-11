import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { getNotifications, markAllNotificationsRead, type AppNotification } from '../../src/api/notifications'

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  SESION_HOY:           { icon: 'calendar-outline',    color: '#3b82f6', bg: '#eff6ff' },
  CHECKIN_DISPONIBLE:   { icon: 'checkbox-outline',    color: '#8b5cf6', bg: '#f5f3ff' },
  PLAN_ACTUALIZADO:     { icon: 'refresh-outline',     color: '#f97316', bg: '#fff7ed' },
  MENSAJE_COACH:        { icon: 'chatbubble-outline',  color: '#06b6d4', bg: '#ecfeff' },
  AJUSTE_NUTRICIONAL:   { icon: 'nutrition-outline',   color: '#22c55e', bg: '#f0fdf4' },
  LOGRO:                { icon: 'trophy-outline',      color: '#f59e0b', bg: '#fffbeb' },
  PROPUESTA_COACH:      { icon: 'person-outline',      color: '#1e3a5f', bg: '#f0f4ff' },
}

const DEFAULT_CONFIG = { icon: 'notifications-outline', color: '#6b7280', bg: '#f3f4f6' }

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `hace ${mins < 1 ? 1 : mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function NotificationRow({ item }: { item: AppNotification }) {
  const cfg = TYPE_CONFIG[item.type] ?? DEFAULT_CONFIG
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: item.read ? 'white' : '#fafafa',
      borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
    }}>
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#111827' }} numberOfLines={2}>
            {item.title}
          </Text>
          {!item.read && (
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#f97316', flexShrink: 0 }} />
          )}
        </View>
        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6b7280', lineHeight: 17 }} numberOfLines={3}>
          {item.body}
        </Text>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#9ca3af', marginTop: 2 }}>
          {formatRelative(item.createdAt)}
        </Text>
      </View>
    </View>
  )
}

export default function NotificationsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  })

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
    },
  })

  const unread = data?.unreadCount ?? 0

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 12, paddingBottom: 12, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#1e3a5f',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: 'white' }}>
          Notificaciones{unread > 0 ? ` (${unread})` : ''}
        </Text>
        {unread > 0 ? (
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); markAllMutation.mutate() }}
            style={{ paddingHorizontal: 10, paddingVertical: 6 }}
            activeOpacity={0.7}
            disabled={markAllMutation.isPending}
          >
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.8)' }}>
              Leídas
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      ) : (
        <FlatList
          data={data?.notifications ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow item={item} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 }}>
              <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
              <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#9ca3af' }}>
                Sin notificaciones
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#d1d5db', textAlign: 'center', paddingHorizontal: 40 }}>
                Aqui aparecerán actualizaciones de tu plan, check-ins y mensajes del coach.
              </Text>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 }}
        />
      )}
    </View>
  )
}
