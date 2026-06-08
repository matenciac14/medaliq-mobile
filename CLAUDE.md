# Medaliq Mobile

## Qué es
App nativa iOS + Android para Medaliq — coaching deportivo con AI para LatAm.
Consume los mismos endpoints REST del backend Next.js en `medaliq.com`.

## Stack
- React Native + Expo managed workflow (~52)
- Expo Router v4 — file-based routing
- NativeWind v4 — Tailwind en React Native
- @tanstack/react-query v5 — server state
- Zustand v4 — auth/global state
- expo-secure-store — JWT token storage (NO cookies)
- expo-haptics — feedback táctil en CTAs
- expo-linear-gradient — gradientes de marca
- @expo-google-fonts/inter — tipografía Inter

## Rutas
```
app/
  index.tsx                       ← boot/splash (verifica token → redirige)
  _layout.tsx                     ← root layout: fonts, QueryClient, StatusBar
  (auth)/
    login.tsx
    onboarding.tsx                ← pendiente
  (app)/
    (tabs)/
      _layout.tsx                 ← bottom tabs: dashboard, plan, gym, checkin, profile
      dashboard.tsx
      plan.tsx
      gym.tsx
      checkin.tsx
      profile.tsx
    gym-session.tsx               ← killer feature: tracker activo con rest timer
    log.tsx                       ← log sesión de resistencia
```

## API Layer (`src/api/`)
- `client.ts` — `apiFetch()` wrapper con SecureStore token + header `X-Client: medaliq-mobile`
- `auth.ts` — login, logout, getMe
- `dashboard.ts` — getDashboard
- `gym.ts` — getTodayGymSession, completeGymSession
- `plan.ts` — getPlan
- `checkin.ts` — submitCheckin, getCheckinStatus

**Endpoints mobile en backend:**
- `POST /api/auth/mobile/login` — devuelve JWT + user
- `GET /api/auth/mobile/me` — user actual
- `GET /api/mobile/dashboard` — DashboardData
- `GET /api/mobile/plan` — PlanData (todas las semanas)
- `GET /api/mobile/checkin-status` — pendiente o no
- `GET /api/gym/session/today` — sesión de gym del día
- `POST /api/gym/session/complete` — guarda sets
- `POST /api/log/session` — log sesión de resistencia
- `POST /api/checkin` — submit weekly check-in

## Tokens de marca
```
navy: #1e3a5f
navy-mid: #2d5a8e
orange: #f97316
```

## Patrones de UI
- `useSafeAreaInsets()` en TODOS los screens para paddingTop y paddingBottom
- `Haptics.impactAsync(Heavy)` en CTAs principales
- `Haptics.selectionAsync()` en selectors/toggles
- `inputMode="decimal"` / `inputMode="numeric"` para teclados correctos
- Touch targets mínimos: `paddingVertical: 14` (≥44px)
- Scroll principal siempre con `showsVerticalScrollIndicator={false}`
- LinearGradient para hero cards: `['#1e3a5f', '#2d5a8e']`
- CTA primario: `backgroundColor: '#f97316'`
- Fondo base: `backgroundColor: '#f8fafc'`

## Build / Deploy
- Dev: `npx expo start`
- Preview (APK): `eas build --profile preview --platform android`
- Production: `eas build --profile production`
- Submit: `eas submit`

## Estado
- [x] Scaffold completo: config, API layer, store, hooks
- [x] Auth: login screen + boot routing
- [x] Dashboard: sesión del día, métricas, check-in banner
- [x] Plan: weekly view, week selector, session cards
- [x] Gym: preview sesión del día
- [x] Gym Session: tracker activo, rest timer, set logging, finalizar
- [x] Check-in: escalas 1-5, métricas opcionales, submit
- [x] Log: sesión de resistencia, RPE 1-10, FC, duración
- [x] Profile: avatar, plan info, logout
- [ ] Onboarding mobile
- [ ] Push notifications (EAS Notifications)
- [ ] Offline-first gym tracker (AsyncStorage backup)
- [ ] Bluetooth HRM (react-native-ble-plx)
- [ ] Integraciones: Strava, Garmin

## Reglas
- Sin overengineering
- JWT en SecureStore — nunca en AsyncStorage para auth
- Multi-tenant: todos los endpoints ya tienen userId en el backend vía JWT
- Ver ~/.claude/CLAUDE.md para reglas globales
