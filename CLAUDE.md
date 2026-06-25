# Medaliq Mobile

## Que es
App nativa iOS + Android para Medaliq — coaching deportivo para LatAm.
Consume los endpoints REST del backend Next.js (medaliq.com/api/mobile/*).

**Scope actual: solo RUNNING + STRENGTH.** CYCLING, SWIMMING, TRIATHLON, FOOTBALL eliminados de UI (junio 2026).

## Stack
- React Native + Expo managed workflow (~52)
- Expo Router v4 — file-based routing
- NativeWind v4 — Tailwind en React Native
- @tanstack/react-query v5 — server state
- Zustand v4 — auth/global state
- expo-secure-store — JWT token storage (NO cookies, NO AsyncStorage para auth)
- expo-haptics — feedback tactil en CTAs
- expo-linear-gradient — gradientes de marca
- @expo-google-fonts/inter — tipografia Inter

## Estructura de pantallas

```
app/
  index.tsx                       <- boot/splash: verifica token -> redirige
  _layout.tsx                     <- root: fonts, QueryClient, StatusBar
  (auth)/
    login.tsx
    register.tsx
    onboarding.tsx                <- wizard Running/Gym (COMPLETO)
    forgot-password.tsx
  (app)/
    _layout.tsx                   <- verifica auth + onboarding
    (tabs)/
      _layout.tsx                 <- bottom tabs
      dashboard.tsx               <- home: sesion del dia, kcal, macros, check-in banner
      plan.tsx                    <- plan semanal con week selector
      gym.tsx                     <- preview sesion gym del dia
      checkin.tsx                 <- check-in semanal
      nutrition.tsx               <- nutricion del dia + food log
      profile.tsx                 <- avatar, plan info, logout
    gym-session.tsx               <- tracker activo: rest timer, set logging
    gym-history.tsx               <- historial de sesiones gym
    log.tsx                       <- log sesion resistencia (RPE, FC, duracion)
    edit-session.tsx              <- editar sesion completada
    progress.tsx                  <- graficas de peso, FC reposo, adherencia
    upgrade.tsx                   <- paywall cuando feature esta bloqueada
```

## Auth mobile

- Token JWT firmado con `jose` (NO Auth.js — son incompatibles)
- Payload: `{ id, email, name, role, onboardingCompleted, userPlan, features }`
  - `features` incluido en payload para gating en cliente
- Storage: `expo-secure-store` exclusivamente
- Todos los endpoints usan `getMobileUser(req)` de `src/lib/mobile-auth.ts`
- Header requerido: `Authorization: Bearer <token>` + `X-Client: medaliq-mobile`

## API Layer (`src/api/`)

- `client.ts` — `apiFetch()` wrapper: token de SecureStore + header X-Client
- `auth.ts` — login, logout, getMe
- `dashboard.ts` — getDashboard
- `gym.ts` — getTodayGymSession, completeGymSession
- `gym-history.ts` — getGymHistory
- `plan.ts` — getPlan
- `checkin.ts` — submitCheckin, getCheckinStatus
- `nutrition.ts` — getNutrition, logFood
- `progress.ts` — getProgress

## Endpoints mobile en backend (`/api/mobile/*`)

```
POST  /api/auth/mobile/login              <- email+password -> JWT con features
GET   /api/auth/mobile/me                 <- user actual
POST  /api/mobile/onboarding/generate     <- mismo use case que web
GET   /api/mobile/dashboard               <- DashboardData
GET   /api/mobile/dashboard/week-sessions <- sesiones de la semana
GET   /api/mobile/plan                    <- plan completo con semanas, sesiones, logs
GET   /api/mobile/checkin-status          <- si hay check-in pendiente
POST  /api/mobile/checkin                 <- normaliza 1-5->1-10 luego processCheckIn
POST  /api/mobile/log/session             <- log sesion de resistencia
GET   /api/mobile/progress                <- historial metricas (peso, FC, adherencia)
GET   /api/mobile/nutrition               <- plan + log del dia
POST  /api/mobile/nutrition/log           <- loguear alimento (PRO gate)
GET   /api/mobile/gym/week                <- schedule gym de la semana (PRO gate)
POST  /api/mobile/nutrition/generate-meals <- generar comidas con AI (PRO gate)
GET   /api/gym/session/today              <- sesion gym del dia
POST  /api/gym/session/complete           <- guardar sets completados
```

**Nota P0:** 4 endpoints PRO sin feature gate en mobile: `/mobile/nutrition/log`, `/mobile/progress`, `/mobile/gym/week`, `/mobile/nutrition/generate-meals`.

## Onboarding mobile

Archivo: `app/(auth)/onboarding.tsx`

```
type Sport = 'RUNNING' | 'STRENGTH'
type Step = 'goal' | 'sport' | 'hr-fitness' | 'physical' | 'schedule' | 'health' | 'generating'

AEROBIC_SPORTS = ['RUNNING']  <- solo RUNNING pide FC

Flujo:
  RUNNING: goal -> sport -> hr-fitness -> physical -> schedule -> health -> generating
  STRENGTH: goal -> sport -> physical -> generating
  Sin deporte: goal -> physical -> generating (o schedule segun healthGoal)
```

El payload que envia a `/api/mobile/onboarding/generate` es identico al web.

## Tokens de marca
```
navy:     #1e3a5f
navy-mid: #2d5a8e
orange:   #f97316
```

## Patrones de UI obligatorios
- `useSafeAreaInsets()` en TODOS los screens para paddingTop y paddingBottom
- `Haptics.impactAsync(Heavy)` en CTAs principales
- `Haptics.selectionAsync()` en selectors/toggles
- `inputMode="decimal"` / `inputMode="numeric"` para teclados correctos
- Touch targets minimos: `paddingVertical: 14` (>=44px)
- Scroll con `showsVerticalScrollIndicator={false}`
- LinearGradient para hero cards: `['#1e3a5f', '#2d5a8e']`
- CTA primario: `backgroundColor: '#f97316'`
- Fondo base: `backgroundColor: '#f8fafc'`

## Build / Deploy
- Dev: `npx expo start`
- Preview APK: `eas build --profile preview --platform android`
- Production: `eas build --profile production`
- Submit: `eas submit`

## Estado actual (junio 2026)

### Completo
- Auth: login + registro + boot routing + onboarding wizard (Running/Gym)
- Dashboard: sesion del dia, kcal objetivo, macros, check-in banner, week selector
- Plan: vista semanal, week selector, session cards, session logs
- Gym: preview sesion del dia + tracker activo (rest timer, set logging, finalizar)
- Gym history: historial completo de sesiones
- Check-in: escalas 1-5, metricas opcionales, submit
- Log: sesion de resistencia, RPE 1-10, FC, duracion
- Nutricion: plan del dia + food log
- Progress: graficas de peso, FC reposo, adherencia
- Profile: avatar, plan info, logout
- Upgrade: paywall screen para features PRO bloqueadas
- Edit session: editar sesion completada
- Rate limiting en todos los endpoints mobile

### Pendiente
- Push notifications (EAS Notifications)
- Offline-first gym tracker (AsyncStorage backup cuando no hay red)
- Bluetooth HRM (react-native-ble-plx)
- Integraciones: Strava, Garmin
- Feature gating mobile (P0 en BACKLOG.md)
- Mensajeria coach-atleta mobile (Paridad Pulsefit)

## Reglas
- JWT en SecureStore — nunca en AsyncStorage para auth
- Multi-tenant: userId viene del token JWT en el backend, nunca del body
- Scope: solo RUNNING + STRENGTH en UI — no agregar otros deportes
- Ver MEDALIQ-PROJECT/CLAUDE.md para arquitectura y reglas del backend
- Ver ~/.claude/CLAUDE.md para reglas globales
