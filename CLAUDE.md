# Medaliq Mobile

> Contexto del producto, modelo de negocio y arquitectura general: ver `../CLAUDE.md`
> Reglas del backend y API: ver `../MEDALIQ-PROJECT/CLAUDE.md`

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

**Variables de entorno requeridas:**
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
```

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
    forgot-password.tsx
    select-role.tsx               ← Google OAuth: elegir Atleta o Coach
  (app)/
    _layout.tsx                   ← verifica auth + onboarding
    (tabs)/
      _layout.tsx                 ← bottom tabs + polling badge unread (30s)
      dashboard.tsx
      plan.tsx
      gym.tsx
      nutrition.tsx
      progress.tsx
      profile.tsx                 ← badge unread mensajes
      checkin.tsx                 ← oculto del nav (href: null), accesible como ruta
    gym-session.tsx
    gym-history.tsx
    log.tsx
    edit-session.tsx
    progress.tsx
    upgrade.tsx
    messages.tsx                  ← chat coach-atleta, polling 5s
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
POST  /api/mobile/log/session
GET   /api/mobile/progress
GET   /api/mobile/nutrition
POST  /api/mobile/nutrition/log           (PRO gate)
GET   /api/mobile/gym/week                (PRO gate)
POST  /api/mobile/nutrition/generate-meals (PRO gate)
GET   /api/gym/session/today
POST  /api/gym/session/complete
GET   /api/mobile/messages
POST  /api/mobile/messages
POST  /api/mobile/messages/read
GET   /api/mobile/messages/unread-count
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

## Estado (junio 2026)

### Completo
- Auth: login · registro · Google OAuth · forgot password · onboarding wizard
- Dashboard · Plan · Gym tracker · Gym history
- Check-in semanal con modo rápido "Todo bien"
- Log sesión resistencia
- Nutrición · Progreso · Perfil
- Mensajería coach-atleta (pantalla + badge unread en tab Perfil)
- Upgrade/paywall

### Pendiente
- Push notifications (EAS Notifications)
- Offline-first gym tracker (AsyncStorage backup sin red)
- Bluetooth HRM (react-native-ble-plx)
- Integraciones Strava / Garmin
- Dashboard km/semana (ya en web, falta mobile)
- Gym session interactiva estilo Strong/Hevy (P1 retención segmento fuerza)

---

## Skills — decisión autónoma del agente

Cualquier tarea que toque este proyecto: cargar `react-native-architecture`.
Si además toca la DB o API: cargar también `prisma-development`.
