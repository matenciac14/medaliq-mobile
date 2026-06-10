import { apiFetch } from './client'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatResponse = {
  content: string
  remaining: number
  limit: number
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/api/mobile/ai/chat', {
    method: 'POST',
    body: { messages },
  })
}
