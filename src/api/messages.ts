import { apiFetch } from './client'

export type Msg = {
  id: string
  fromId: string
  toId: string
  content: string
  readAt: string | null
  createdAt: string
}

export type MeInfo = {
  id: string
  coachId: string | null
  coachName: string | null
}

export function getMessagesMe(): Promise<MeInfo> {
  return apiFetch('/api/mobile/messages/me')
}

export function getMessages(withId: string): Promise<{ messages: Msg[] }> {
  return apiFetch(`/api/mobile/messages?with=${withId}`)
}

export function sendMessage(toId: string, content: string): Promise<{ message: Msg }> {
  return apiFetch('/api/mobile/messages', { method: 'POST', body: { toId, content } })
}

export function markMessagesRead(fromId: string): Promise<void> {
  return apiFetch('/api/mobile/messages/read', { method: 'PATCH', body: { fromId } })
}

export function getUnreadCount(): Promise<{ count: number }> {
  return apiFetch('/api/mobile/messages/unread-count')
}
