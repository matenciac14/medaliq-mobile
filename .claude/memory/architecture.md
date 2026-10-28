# Medaliq Mobile — Arquitectura

> Decisiones de producto: MEDALIQ/.claude/memory/architecture.md

## Stack
React Native + Expo ~54 · Expo Router v6 · NativeWind v4 · TanStack Query v5 · Zustand v4 · expo-secure-store · pnpm

## Estructura de directorios
```
app/
  _layout.tsx           ← root layout (providers: QueryClient, ThemeProvider)
  (auth)/               ← login, register, onboarding, select-role, forgot-password
  (app)/
    _layout.tsx         ← auth guard + push notification listener
    (tabs)/             ← dashboard, plan, gym, nutrition, progress, profile, checkin
    *.tsx               ← screens fuera de tabs (gym-session, messages, log, gym-history,
                           coach-chat, coach-inbox, edit-session, exercises, find-coach,
                           grocery-list, gym-builder, log-history, log-run, log,
                           messages, notifications, nutrition-apply-template,
                           nutrition-builder, nutrition-constructor, nutrition-day-builder,
                           nutrition-week-planner, pricing, progress, routine-edit, upgrade,
                           edit-health-profile, integrations)
src/
  api/                  ← una función por módulo (auth, gym, nutrition, plan, checkin,
                           coach, dashboard, exercises, gym-history, messages,
                           notifications, nutrition, plan, profile, progress)
  store/                ← auth.ts, gymSession.ts, gymSessionDraft.ts (Zustand)
  components/           ← dashboard/, plan/, shared/, ui/
  hooks/                ← useHealthKit, otros custom hooks
  services/             ← healthkit.service.ts
  lib/                  ← utilidades compartidas
  types/                ← tipos globales
  constants/            ← constantes (colores, rutas, etc.)
```

## Auth flow
- JWT en SecureStore (NUNCA AsyncStorage)
- Header: `Authorization: Bearer <token>` + `X-Client: medaliq-mobile`
- GETs incluyen `X-Timezone`
- Boot: `getMe()` → 401 → clear store → redirect `/login`
- Refresh proactivo: push `features_updated` + AppState foreground → `refreshUser()`
- Google OAuth: `expo-auth-session` → `id_token` → `POST /api/mobile/auth/google`

## Estado global (Zustand)
- `store/auth.ts` — usuario, token, features flags. NO tocar sin leer seguridad.md
- `store/gymSession.ts` — sesión de gym en curso (activa/en pausa)
- `store/gymSessionDraft.ts` — borrador de nueva sesión gym

## Data fetching (TanStack Query)
- Queries en screens directamente, no en stores
- `apiFetch` en `src/api/client.ts` — wrapper central de fetch con auth headers

## Sin capa domain
- Mobile NO tiene `domain/`. La lógica de negocio vive en el backend (web).
- `src/api/` solo hace llamadas HTTP — sin lógica de negocio aquí
- Lógica de UI state → hooks; lógica de sesión gym → Zustand

## UI — obligatorio
- `useSafeAreaInsets()` en todos los screens
- Touch targets >= 44px (`paddingVertical: 14`)
- `Haptics.impactAsync(Heavy)` en CTAs, `selectionAsync()` en toggles
- Componentes nativos del OS: DateTimePicker, ActionSheet — nunca simular con TextInput
- `inputMode="decimal"` / `"numeric"` para teclados numéricos
- Colores: navy `#1e3a5f`, orange `#f97316`, fondo `#f8fafc`

## Decisiones clave
| Decisión | Por qué |
|----------|---------|
| expo-secure-store para JWT | Seguridad — AsyncStorage es plano sin cifrado |
| Zustand solo para estado de sesión activa | Resto es server state manejado por TanStack Query |
| Sin worktrees en mobile | Ramas simples feature/* desde main — sin DB ni build server |
| Roadmap en web repo | Solo hay uno, en MEDALIQ-PROJECT/src/app/admin/roadmap/roadmap_data.ts |
