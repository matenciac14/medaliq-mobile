import { apiFetch } from './client'

export async function registerPushToken(token: string): Promise<void> {
  await apiFetch('/api/mobile/push-token', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}
