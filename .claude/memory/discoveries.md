# Medaliq Mobile — Descubrimientos y Traps Técnicos

> Traps compartidos con web en: MEDALIQ/specs/_traps.spec.md y _mobile_mirror.spec.md (60+ pares)

## NO HACER
- NO AsyncStorage para datos sensibles — solo SecureStore
- NO simular con TextInput lo que el OS resuelve nativamente
- NO modificar store/auth.ts o api/client.ts sin leer seguridad.md
- NO modificar _layout.tsx (root o app) sin entender ciclo auth + push

## Patrones descubiertos en sesiones

### Header X-Client obligatorio — el error más silencioso (2026-10-29)

Todo request a `/api/mobile/*` debe incluir `X-Client: medaliq-mobile`. Sin él, `getMobileUser(req)` retorna `null` y el endpoint responde 401 sin ningún mensaje explicativo. Si el cliente recibe 401 inexplicable en un endpoint que debería funcionar, verificar este header primero.

### Onboarding DEBE devolver token renovado (2026-10-29)

`POST /api/mobile/onboarding` debe incluir `{ ..., token: string }` en la respuesta con el JWT actualizado. Sin este token, el cliente mantiene `onboardingCompleted: false` en el store y redirige al onboarding en loop aunque el servidor ya lo completó.

### muscleSoreness (mobile) = hardestSessionRpe (DB) (2026-10-29)

El campo RPE máximo de la semana tiene 4 nombres según la capa:
- Mobile envía: `muscleSoreness`
- Web envía: `hardestRpe`
- Domain recibe: `rpe`
- DB guarda: `hardestSessionRpe`

Un agente que busca `muscleSoreness` en el schema no lo encontrará. Buscar `hardestSessionRpe`.

### nutritionAdherencePct: escala 0-100 en mobile, 1-10 en domain (2026-10-29)

Mobile envía `nutritionAdherencePct` como 0-100 (porcentaje). El mapper en el endpoint divide por 10 antes de pasar al domain (escala 1-10). Si un test o validación espera 1-10 desde mobile, está mal.

### sessionId mobile = plannedSessionId en web/domain (2026-10-29)

Al loggear una sesión desde mobile, el campo se llama `sessionId` en el request body mobile pero `plannedSessionId` en el domain y en la DB. Mismo campo, nombre diferente.

### Dashboard auto-completa el plan internamente (2026-10-29)

`GET /api/mobile/dashboard` ejecuta `handlePlanLifecycle` que puede marcar el plan como completado, avanzar semanas, o auto-completar. Esto sucede en cada llamada al dashboard. No es un endpoint dedicado de "completar plan" — es un side effect del GET.

### /(app)/pending — bug conocido con cast as never (2026-10-28)

La pantalla `/(app)/pending` existe en el router pero en algún punto del código se usa `as never` como cast para navegar a ella. Esto compila pero puede fallar en runtime si Expo Router cambia su tipado. Pendiente verificar si la pantalla existe como archivo real y reemplazar el cast con el tipo correcto.

### features_updated push → refreshUser() → POST /api/mobile/auth/refresh (2026-10-29)

Cuando un coach activa un atleta, el servidor envía un push notification de tipo `features_updated`. El cliente debe escuchar este evento en `_layout.tsx` y llamar `refreshUser()` que internamente hace `POST /api/mobile/auth/refresh`. Sin este flujo, el atleta recién activado sigue viendo el panel de atleta pendiente aunque el servidor ya lo activó. No eliminar ni simplificar este listener.

### Google Health Connect (Android) no implementado (2026-10-29)

HealthKit (iOS) está implementado parcialmente. Health Connect (Android) no está implementado. Si un usuario Android espera sincronización de wearables, no va a funcionar. No es un bug — es una feature pendiente. No simular ni hacer stub de esta funcionalidad.
