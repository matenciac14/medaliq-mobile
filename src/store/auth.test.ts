import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from './auth'
import type { SessionUser } from '../api/auth'

vi.mock('../api/auth', () => ({
  refreshToken: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------
const mockUser: SessionUser = {
  id: 'user-123',
  name: 'Miguel Test',
  email: 'miguel@test.com',
  role: 'ATHLETE',
  userPlan: 'TRIAL',
  onboardingCompleted: true,
  features: {
    plan: true,
    checkin: true,
    nutrition: true,
    progress: true,
    log: true,
    coach: false,
    gym: true,
  },
}

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------
describe('useAuthStore — estado inicial', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: true })
  })

  it('user es null al inicio', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('isLoading es true al inicio', () => {
    expect(useAuthStore.getState().isLoading).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// setUser
// ---------------------------------------------------------------------------
describe('useAuthStore — setUser', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: true })
  })

  it('guarda el usuario correctamente', () => {
    useAuthStore.getState().setUser(mockUser)
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })

  it('actualiza todos los campos del usuario', () => {
    useAuthStore.getState().setUser(mockUser)
    const { user } = useAuthStore.getState()
    expect(user?.id).toBe('user-123')
    expect(user?.role).toBe('ATHLETE')
    expect(user?.userPlan).toBe('TRIAL')
    expect(user?.onboardingCompleted).toBe(true)
  })

  it('guarda features correctamente', () => {
    useAuthStore.getState().setUser(mockUser)
    const features = useAuthStore.getState().user?.features
    expect(features?.plan).toBe(true)
    expect(features?.gym).toBe(true)
    expect(features?.coach).toBe(false)
    expect(features?.gym).toBe(true)
  })

  it('setUser(null) limpia el usuario', () => {
    useAuthStore.getState().setUser(mockUser)
    useAuthStore.getState().setUser(null)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('reemplaza el usuario anterior al llamar setUser de nuevo', () => {
    const otherUser: SessionUser = { ...mockUser, id: 'user-456', userPlan: 'PRO' }
    useAuthStore.getState().setUser(mockUser)
    useAuthStore.getState().setUser(otherUser)
    expect(useAuthStore.getState().user?.id).toBe('user-456')
    expect(useAuthStore.getState().user?.userPlan).toBe('PRO')
  })
})

// ---------------------------------------------------------------------------
// setLoading
// ---------------------------------------------------------------------------
describe('useAuthStore — setLoading', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: true })
  })

  it('setLoading(false) deshabilita el loading', () => {
    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  it('setLoading(true) habilita el loading', () => {
    useAuthStore.setState({ isLoading: false })
    useAuthStore.getState().setLoading(true)
    expect(useAuthStore.getState().isLoading).toBe(true)
  })

  it('setLoading no afecta al usuario', () => {
    useAuthStore.getState().setUser(mockUser)
    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })
})

// ---------------------------------------------------------------------------
// refreshUser
// ---------------------------------------------------------------------------
describe('useAuthStore — refreshUser', () => {
  let refreshToken: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const mod = await import('../api/auth')
    refreshToken = vi.mocked(mod.refreshToken)
    refreshToken.mockReset()
    useAuthStore.setState({ user: mockUser, isLoading: false })
  })

  it('actualiza features cuando refreshToken resuelve correctamente', async () => {
    const newFeatures: SessionUser['features'] = {
      plan: true, checkin: true, nutrition: true,
      progress: true, log: true, coach: false, gym: true,
    }
    refreshToken.mockResolvedValue(newFeatures)
    await useAuthStore.getState().refreshUser()
    expect(useAuthStore.getState().user?.features).toEqual(newFeatures)
    // Preserva el resto del usuario
    expect(useAuthStore.getState().user?.id).toBe('user-123')
  })

  it('no hace nada si user es null', async () => {
    useAuthStore.setState({ user: null })
    await useAuthStore.getState().refreshUser()
    expect(refreshToken).not.toHaveBeenCalled()
  })

  it('no lanza error si refreshToken falla (silencioso)', async () => {
    refreshToken.mockRejectedValue(new Error('network error'))
    await expect(useAuthStore.getState().refreshUser()).resolves.toBeUndefined()
    // Features anteriores se mantienen sin cambio
    expect(useAuthStore.getState().user?.features).toEqual(mockUser.features)
  })
})

// ---------------------------------------------------------------------------
// userPlan — los 3 estados válidos
// ---------------------------------------------------------------------------
describe('useAuthStore — userPlan válidos', () => {
  it('acepta TRIAL', () => {
    useAuthStore.getState().setUser({ ...mockUser, userPlan: 'TRIAL' })
    expect(useAuthStore.getState().user?.userPlan).toBe('TRIAL')
  })

  it('acepta PRO', () => {
    useAuthStore.getState().setUser({ ...mockUser, userPlan: 'PRO' })
    expect(useAuthStore.getState().user?.userPlan).toBe('PRO')
  })

  it('acepta INACTIVE', () => {
    useAuthStore.getState().setUser({ ...mockUser, userPlan: 'INACTIVE' })
    expect(useAuthStore.getState().user?.userPlan).toBe('INACTIVE')
  })
})
