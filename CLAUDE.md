# Medaliq Mobile

> Contexto del producto, modelo de negocio y arquitectura general: ver `../CLAUDE.md`
> Reglas del backend y API: ver `../MEDALIQ-PROJECT/CLAUDE.md`
> **Roadmap y bugs:** fuente canónica compartida con web → `../MEDALIQ-PROJECT/src/app/admin/roadmap/roadmap-data.ts` — leer protocolo en `../CLAUDE.md`

## Stack
- React Native + Expo managed workflow (~54)
- Expo Router v4 — file-based routing
- NativeWind v4 — Tailwind en React Native
- @tanstack/react-query v5 — server state
- Zustand v4 — auth/global state
- expo-secure-store — JWT token storage
- expo-haptics — feedback táctil en CTAs
- expo-linear-gradient — gradientes de marca
- expo-auth-session ~7.0 — Google OAuth mobile
- @expo-google-fonts/inter — tipografía Inter

---

## Variables de entorno

```bash
# .env o app.config.js
EXPO_PUBLIC_API_URL                   # URL base del backend (ej: https://medaliq.com)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID      # Google OAuth — client ID web
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID      # Google OAuth — client ID iOS
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID  # Google OAuth — client ID Android
```

---

## Auth mobile

- JWT firmado con `jose` (NO Auth.js — incompatibles)
- Payload: `{ id, email, name, role, onboardingCompleted, userPlan, features }`
- Storage: `expo-secure-store` exclusivamente — nunca AsyncStorage para auth
- Todos los endpoints usan `getMobileUser(req)` del backend
- Header requerido: `Authorization: Bearer <token>` + `X-Client: medaliq-mobile`

### Google OAuth mobile

- `expo-auth-session` + `useIdTokenAuthRequest` en login screen
- `WebBrowser.maybeCompleteAuthSession()` en el componente raíz del login
- Flow: `promptAsync()` → Google devuelve `id_token` → `POST /api/mobile/auth/google`
- Si `needsRoleSelection: true` → pantalla `select-role`
- Después de elegir rol → `POST /api/mobile/auth/set-role` → nuevo JWT

---

## State management (Zustand)

`src/store/` — estado global de auth:

```ts
// useAuthStore
{
  user: MobileUser | null   // payload del JWT decodificado
  token: string | null      // JWT en SecureStore
  isLoading: boolean
  login(token)              // guarda en SecureStore + setea user
  logout()                  // borra SecureStore + limpia estado
  setUser(user)
}
```

El boot (`app/index.tsx`) llama `getMe()` al arrancar: si 401 → `logout()` → `/(auth)/login`.

### Token expirado — flujo de re-login

No hay refresh token. Cuando `apiFetch()` recibe 401:
1. Llama `logout()` del store → borra token de SecureStore
2. `router.replace('/(auth)/login')`
3. Usuario re-autentica — obtiene nuevo JWT

---

## Patrón useQuery / useMutation

```ts
// Query estándar (ejemplo: dashboard)
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['dashboard'],
  queryFn: getDashboard,
})

// Mutation estándar (ejemplo: check-in)
const { mutate, isPending } = useMutation({
  mutationFn: submitCheckin,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkin-status'] }),
})
```

`queryClient` vive en `app/_layout.tsx` como `QueryClientProvider`. Ver `src/api/*.ts` para las funciones `queryFn`.

---

## API Layer (`src/api/`)

- `client.ts` — `apiFetch()` wrapper: token de SecureStore + header X-Client
- `auth.ts` — login · logout · getMe · googleLogin · setMobileRole
- `dashboard.ts` — getDashboard
- `gym.ts` — getTodayGymSession · completeGymSession
- `gym-history.ts` — getGymHistory
- `plan.ts` — getPlan
- `checkin.ts` — submitCheckin · getCheckinStatus
- `nutrition.ts` — getNutrition · logFood
- `progress.ts` — getProgress
- `messages.ts` — getMessages · sendMessage · markRead · getUnreadCount
- `notifications.ts` — registerPushToken
- `coach.ts` — getCoachAthletes (solo COACH)

> `log.ts` no existe — `log.tsx` y `log-run.tsx` llaman `apiFetch` directamente desde el screen.

---

## Estructura de pantallas

```
app/
  index.tsx                       ← boot/splash: verifica token → redirige
  _layout.tsx                     ← root: fonts, QueryClient, StatusBar
  (auth)/
    login.tsx                     ← email+password + botón Google
    register.tsx
    onboarding.tsx                ← wizard Running/Gym
    forgot-password.tsx           ← llama /api/auth/forgot-password (endpoint web)
    select-role.tsx               ← Google OAuth: elegir Atleta o Coach
  (app)/
    _layout.tsx                   ← verifica auth + onboarding
    (tabs)/
      _layout.tsx                 ← bottom tabs + polling badge unread (30s)
      dashboard.tsx
      plan.tsx
      gym.tsx
      nutrition.tsx
      progress.tsx                ← resumen rápido de progreso (tab)
      profile.tsx                 ← badge unread mensajes
      checkin.tsx                 ← oculto del nav (href: null), accesible como ruta
    gym-session.tsx
    gym-history.tsx
    log.tsx
    log-run.tsx                   ← log de carrera libre (sin sesión planificada)
    edit-session.tsx
    routine-edit.tsx              ← edición de rutina semanal self-directed
    progress.tsx                  ← vista detallada de progreso (fuera de tabs)
    upgrade.tsx
    messages.tsx                  ← chat atleta→coach, polling 5s
    coach-inbox.tsx               ← lista de atletas del coach con badge unread, polling 30s
    coach-chat.tsx                ← chat coach→atleta (params: athleteId, athleteName)
```

---

## Endpoints mobile backend (`/api/mobile/*`)

```
POST  /api/mobile/auth/login              ← email+password → JWT
GET   /api/mobile/auth/me                 ← user actual
POST  /api/mobile/auth/google             ← idToken → JWT + needsRoleSelection
POST  /api/mobile/auth/set-role           ← ATHLETE|COACH → config + nuevo JWT
POST  /api/mobile/onboarding/generate
GET   /api/mobile/dashboard
GET   /api/mobile/dashboard/week-sessions
GET   /api/mobile/plan
GET   /api/mobile/checkin-status
POST  /api/mobile/checkin                 ← normaliza 1-5→1-10
GET   /api/mobile/sessions/[sessionId]    ← detalle de sesión planificada
GET   /api/mobile/calendar                ← sesiones del mes
GET   /api/mobile/routine                 ← rutina semanal self-directed
POST  /api/mobile/routine                 ← crear/actualizar rutina
GET   /api/mobile/log/session             ← historial de logs
POST  /api/mobile/log/session
GET   /api/mobile/log/session/[logId]
DELETE /api/mobile/log/session/[logId]
GET   /api/mobile/progress
GET   /api/mobile/nutrition
POST  /api/mobile/nutrition/log           (PRO gate)
DELETE /api/mobile/nutrition/log/[id]
GET   /api/mobile/nutrition/log/summary
POST  /api/mobile/nutrition/generate-meals (PRO gate)
GET   /api/mobile/nutrition/foods
GET   /api/mobile/gym/week                (PRO gate)
GET   /api/mobile/gym/history
GET   /api/mobile/gym/templates
GET   /api/gym/session/today              ← endpoint web compartido (NO /mobile/)
POST  /api/gym/session/complete           ← endpoint web compartido (NO /mobile/)
GET   /api/mobile/messages
GET   /api/mobile/messages/me
POST  /api/mobile/messages
POST  /api/mobile/messages/read
GET   /api/mobile/messages/unread-count
POST  /api/mobile/push-token             ← registrar Expo Push Token
GET   /api/mobile/coach/athletes          ← lista atletas del coach + unread count (COACH only)
```

---

## Tokens de marca

```
navy:     #1e3a5f
navy-mid: #2d5a8e
orange:   #f97316
```

---

## Patrones de UI — obligatorios

- `useSafeAreaInsets()` en TODOS los screens para `paddingTop` y `paddingBottom`
- `Haptics.impactAsync(Heavy)` en CTAs principales
- `Haptics.selectionAsync()` en selectors/toggles
- `inputMode="decimal"` / `inputMode="numeric"` para teclados correctos
- Touch targets mínimos: `paddingVertical: 14` (≥ 44px)
- Scroll con `showsVerticalScrollIndicator={false}`
- LinearGradient para hero cards: `['#1e3a5f', '#2d5a8e']`
- CTA primario: `backgroundColor: '#f97316'`
- Fondo base: `backgroundColor: '#f8fafc'`

---

## Build / Deploy

```
Dev:       npx expo start
Preview:   eas build --profile preview --platform android
Prod:      eas build --profile production
Submit:    eas submit
```

---

## Skills — decisión autónoma del agente

Cualquier tarea que toque este proyecto: cargar `react-native-architecture`.
Si además toca la DB o API: cargar también `prisma-development`.

---

## Estado (junio 2026)

> Features completadas: ver `roadmap-data.ts` — no duplicar aquí.

### Gaps vs Web — pendientes priorizados

| Prioridad | Feature | Estado web | Notas |
|-----------|---------|-----------|-------|
| 🔴 P0 | Bottom-nav expone Nutrición y Progreso | ✅ Web sidebar | Hoy solo deep-link — BUG-006 en `roadmap-data.ts` |
| 🟠 P1 | Dashboard km/semana | ✅ Implementado | Falta trasladar endpoint + UI a mobile |
| 🟠 P1 | Gym session interactiva (Strong/Hevy style) | ❌ Binario en web también | P1 retención segmento fuerza |
| 🟡 P2 | Pantalla pending B2B | ❌ | Web tiene `/pending` — mobile no tiene equivalente. Atleta B2B sin activar no tiene flujo claro |
| 🟡 P2 | Push notifications | ❌ | Backend `/api/mobile/push-token` YA implementado — falta frontend EAS + permisos |
| 🟡 P2 | Offline-first gym tracker | ❌ | AsyncStorage backup sin red |
| 🟢 P3 | Integraciones Strava / Garmin | ❌ | Requiere OAuth externo |
| 🟢 P3 | Bluetooth HRM | ❌ | react-native-ble-plx |
