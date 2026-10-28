# Medaliq Mobile

> Producto y negocio → `../CLAUDE.md` | Backend y API → `../MEDALIQ-PROJECT/CLAUDE.md` | Schema → `../MEDALIQ-PROJECT/prisma/schema.prisma`

## Stack
React Native + Expo ~54 · Expo Router v6 · NativeWind v4 · @tanstack/react-query v5 · Zustand v4 · expo-secure-store · pnpm

## Auth
- JWT `jose` en SecureStore (nunca AsyncStorage). Header: `Authorization: Bearer <token>` + `X-Client: medaliq-mobile`
- GETs incluyen `X-Timezone`. Boot: `getMe()` → 401 → clear + login
- Google OAuth: `expo-auth-session` → `id_token` → `POST /api/mobile/auth/google`
- Refresh proactivo: push `features_updated` + AppState foreground → `refreshUser()`

## Naming
Archivos y screens: kebab-case (`gym-history.ts`). Stores: camelCase (`gymSession.ts`). Tests: `.test.ts`

## Estructura
```
app/(auth)/     ← login, register, onboarding, select-role, forgot-password
app/(app)/      ← _layout (auth guard + push listener)
  (tabs)/       ← dashboard, plan, gym, nutrition, progress, profile, checkin
  *.tsx         ← screens fuera de tabs (gym-session, messages, log, etc.)
src/api/        ← apiFetch wrapper + funciones por modulo (auth, gym, nutrition, etc.)
src/store/      ← auth.ts, gymSession.ts, gymSessionDraft.ts
```
Para detalle de pantallas o API layer → leer los archivos directamente.

## UI — obligatorio
- `useSafeAreaInsets()` en todos los screens
- Touch targets >= 44px (`paddingVertical: 14`)
- `Haptics.impactAsync(Heavy)` en CTAs, `selectionAsync()` en toggles
- Componentes nativos del OS: DateTimePicker, ActionSheet, alerts — nunca simular con TextInput
- `inputMode="decimal"` / `"numeric"` para teclados correctos
- Colores: navy `#1e3a5f`, orange `#f97316`, fondo `#f8fafc`

## SDD
Specs y domains: mismas que web → `../specs/<modulo>.spec.md`, `../domains/<modulo>.md`
Traps por modulo: ver indice en `../MEDALIQ-PROJECT/CLAUDE.md`

## Build
`npx expo start` · `eas build --profile preview --platform android` · `eas submit`

**Pre-push gate** (hook en `.git/hooks/pre-push`): `tsc --noEmit` + `pnpm test` deben pasar. Nunca pushear con errores TS o tests rotos.

## NO HACER
- **NO** agregar dependencias npm/expo sin preguntar
- **NO** modificar auth stores (`store/auth.ts`, `api/client.ts`) sin leer `seguridad.md`
- **NO** modificar `_layout.tsx` (root o app) sin entender ciclo auth + push
- **NO** usar AsyncStorage para datos sensibles — solo SecureStore
- **NO** simular con TextInput lo que el OS resuelve nativamente
- **NO** agregar AI/LLM sin aprobacion
- **NO** crear archivos nuevos si la logica cabe en uno existente

## /wrap — Reflex de cierre de sesion

Correr SIEMPRE al terminar una sesion de trabajo.

1. Actualizar `.claude/memory/session.md`:
   - `## Ultima actualizacion` → fecha de hoy
   - `## Lo que se hizo en esta sesion` → lista de lo implementado/corregido
   - `## Proxima sesion` → proximos pasos concretos
2. Si hubo patron nuevo o trap descubierto → agregar a `.claude/memory/discoveries.md`
3. Si cambio arquitectura o decision tecnica → actualizar `.claude/memory/architecture.md`

---

## Al terminar
1. Roadmap: `done: true` en `../MEDALIQ-PROJECT/src/app/admin/roadmap/roadmap_data.ts`
2. Spec: actualizar si cambio contrato
3. Domain doc: actualizar si cambio comportamiento
4. Tests: para logica nueva
