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
  userPlan: 'FREE' | 'TRIAL' | 'PRO' | 'INACTIVE'
  onboardingCompleted: boolean
  features: {
    plan: boolean
    checkin: boolean
    nutrition: boolean
    progress: boolean
    log: boolean
    coach: boolean
    gym: boolean
  }
}

export async function login(payload: LoginPayload): Promise<SessionUser> {
  const res = await apiFetch<{ token: string; user: SessionUser }>(
    '/api/mobile/auth/login',
    { method: 'POST', body: payload, auth: false }
  )
  await saveToken(res.token)
  return res.user
}

export async function logout() {
  await clearToken()
}

export async function getMe(): Promise<SessionUser> {
  return apiFetch<SessionUser>('/api/mobile/auth/me')
}

export async function googleLogin(idToken: string): Promise<{ user: SessionUser; needsRoleSelection: boolean }> {
  const res = await apiFetch<{ token: string; user: SessionUser; needsRoleSelection: boolean }>(
    '/api/mobile/auth/google',
    { method: 'POST', body: { idToken }, auth: false }
  )
  await saveToken(res.token)
  return { user: res.user, needsRoleSelection: res.needsRoleSelection }
}

export async function setMobileRole(role: 'ATHLETE' | 'COACH'): Promise<SessionUser> {
  const res = await apiFetch<{ token: string; user: SessionUser }>(
    '/api/mobile/auth/set-role',
    { method: 'POST', body: { role } }
  )
  await saveToken(res.token)
  return res.user
}

export async function refreshToken(): Promise<SessionUser['features']> {
  const res = await apiFetch<{ token: string; features: SessionUser['features'] }>(
    '/api/mobile/auth/refresh',
    { method: 'POST' }
  )
  await saveToken(res.token)
  return res.features
}
