import { apiFetch } from './client'

export async function registerPushToken(token: string): Promise<void> {
  await apiFetch('/api/mobile/push-token', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export type AppNotification = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type NotificationsResponse = {
  notifications: AppNotification[]
  unreadCount: number
}

export async function getNotifications(): Promise<NotificationsResponse> {
  return apiFetch('/api/mobile/notifications')
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch('/api/mobile/notifications/read-all', { method: 'PATCH' })
}
