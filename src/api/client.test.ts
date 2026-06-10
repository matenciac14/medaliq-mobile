import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as SecureStore from 'expo-secure-store'

// vi.mock se hoistea antes de los imports — el módulo ya está mockeado al importar client
vi.mock('expo-secure-store', () => ({
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  getItemAsync: vi.fn().mockResolvedValue(null),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}))

import { apiFetch, saveToken, getToken, clearToken } from './client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockOkResponse(data: unknown) {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(data) }
}

function mockErrorResponse(status: number, body: unknown) {
  return { ok: false, status, json: vi.fn().mockResolvedValue(body) }
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------
describe('saveToken', () => {
  it('guarda el token en SecureStore', async () => {
    await saveToken('my-jwt')
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('medaliq_session_token', 'my-jwt')
  })
})

describe('getToken', () => {
  it('lee el token desde SecureStore', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('stored-token')
    const token = await getToken()
    expect(token).toBe('stored-token')
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('medaliq_session_token')
  })

  it('devuelve null si no hay token', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(null)
    expect(await getToken()).toBeNull()
  })
})

describe('clearToken', () => {
  it('elimina el token de SecureStore', async () => {
    await clearToken()
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('medaliq_session_token')
  })
})

// ---------------------------------------------------------------------------
// apiFetch — headers
// ---------------------------------------------------------------------------
describe('apiFetch — headers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('siempre incluye Content-Type y X-Client', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(mockOkResponse({ ok: true }) as any)
    await apiFetch('/test')
    const [, init] = vi.mocked(global.fetch).mock.calls[0] as any
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.headers['X-Client']).toBe('medaliq-mobile')
  })

  it('agrega Authorization Bearer cuando hay token', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('valid-token')
    vi.mocked(global.fetch).mockResolvedValueOnce(mockOkResponse({}) as any)
    await apiFetch('/test', { auth: true })
    const [, init] = vi.mocked(global.fetch).mock.calls[0] as any
    expect(init.headers['Authorization']).toBe('Bearer valid-token')
  })

  it('no agrega Authorization cuando no hay token', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(null)
    vi.mocked(global.fetch).mockResolvedValueOnce(mockOkResponse({}) as any)
    await apiFetch('/test', { auth: true })
    const [, init] = vi.mocked(global.fetch).mock.calls[0] as any
    expect(init.headers['Authorization']).toBeUndefined()
  })

  it('omite Authorization cuando auth=false (sin leer SecureStore)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(mockOkResponse({}) as any)
    await apiFetch('/test', { auth: false })
    const [, init] = vi.mocked(global.fetch).mock.calls[0] as any
    expect(init.headers['Authorization']).toBeUndefined()
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// apiFetch — URL y método
// ---------------------------------------------------------------------------
describe('apiFetch — URL y método', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('construye la URL completa con BASE_URL', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(mockOkResponse({}) as any)
    await apiFetch('/api/mobile/dashboard')
    const [url] = vi.mocked(global.fetch).mock.calls[0] as any
    expect(url).toContain('/api/mobile/dashboard')
  })

  it('usa GET por defecto', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(mockOkResponse({}) as any)
    await apiFetch('/test')
    const [, init] = vi.mocked(global.fetch).mock.calls[0] as any
    expect(init.method).toBe('GET')
  })

  it('usa el método especificado', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(mockOkResponse({}) as any)
    await apiFetch('/test', { method: 'POST', body: {} })
    const [, init] = vi.mocked(global.fetch).mock.calls[0] as any
    expect(init.method).toBe('POST')
  })

  it('serializa el body como JSON', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(mockOkResponse({}) as any)
    const payload = { email: 'a@b.com', password: '123' }
    await apiFetch('/test', { method: 'POST', body: payload, auth: false })
    const [, init] = vi.mocked(global.fetch).mock.calls[0] as any
    expect(init.body).toBe(JSON.stringify(payload))
  })

  it('no envía body cuando no se provee', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(mockOkResponse({}) as any)
    await apiFetch('/test')
    const [, init] = vi.mocked(global.fetch).mock.calls[0] as any
    expect(init.body).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// apiFetch — manejo de errores
// ---------------------------------------------------------------------------
describe('apiFetch — errores HTTP', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('lanza error con error.error cuando el servidor lo provee', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockErrorResponse(401, { error: 'No autorizado' }) as any
    )
    await expect(apiFetch('/test')).rejects.toThrow('No autorizado')
  })

  it('lanza error con error.message como fallback', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockErrorResponse(400, { message: 'Datos inválidos' }) as any
    )
    await expect(apiFetch('/test')).rejects.toThrow('Datos inválidos')
  })

  it('lanza HTTP {status} cuando no hay mensaje de error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockErrorResponse(500, {}) as any
    )
    await expect(apiFetch('/test')).rejects.toThrow('HTTP 500')
  })

  it('no lanza si la respuesta es ok', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(mockOkResponse({ data: 'ok' }) as any)
    await expect(apiFetch('/test')).resolves.toEqual({ data: 'ok' })
  })
})
