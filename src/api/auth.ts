import { apiFetch, saveToken, clearToken } from './client'

export type LoginPayload = {
  email: string
  password: string
}

export type SessionUser = {
  id: string
  name: string
  email: string
  role: 'ATHLETE' | 'COACH' | 'ADMIN'
  userPlan: 'FREE' | 'TRIAL' | 'PRO'
  onboardingCompleted: boolean
}

export async function login(payload: LoginPayload): Promise<SessionUser> {
  const res = await apiFetch<{ token: string; user: SessionUser }>(
    '/api/auth/mobile/login',
    { method: 'POST', body: payload, auth: false }
  )
  await saveToken(res.token)
  return res.user
}

export async function logout() {
  await clearToken()
}

export async function getMe(): Promise<SessionUser> {
  return apiFetch<SessionUser>('/api/auth/mobile/me')
}
