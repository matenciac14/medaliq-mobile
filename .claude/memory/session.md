# Medaliq Mobile — Sesión Actual

> Actualizar al CERRAR cada sesión. Leer al ARRANCAR cada sesión.
> Leer también: MEDALIQ/.claude/memory/session.md para contexto de producto.

## Última actualización
2026-10-28

## Estado técnico
- Branch activa: main
- Pre-push gate: tsc --noEmit + pnpm test (hook en .git/hooks/pre-push) ✅ activo
- Build: npx expo start (dev) · eas build --profile preview (staging)
- Prisma import correcto en web: `@/generated/prisma/client` (no `@/generated/prisma`)

## Pantallas implementadas
**Tabs:** dashboard, plan, gym, nutrition, progress, profile, checkin
**Fuera de tabs:** gym-session, gym-history, gym-builder, log, log-run, log-history,
  messages, coach-chat, coach-inbox, notifications, find-coach, exercises,
  edit-session, edit-health-profile, grocery-list, nutrition-builder,
  nutrition-constructor, nutrition-day-builder, nutrition-week-planner,
  routine-edit, pricing, upgrade, integrations

## Lo que se hizo en esta sesión
- AI Factory setup: pre-push gate, CLAUDE.md con /wrap, memoria
- 4 errores TS corregidos: onboarding cast `as never`, useHealthKit `err: unknown`, generateMeals export, expo-keep-awake instalado

## Próxima sesión
- EAS Build setup: app.json bundleIdentifier/package + eas.json profiles (App Store + Google Play)
- Pantalla referral en register: campo optional referralCode al registrar coach
- Verificar que `/(app)/pending` existe como pantalla real (actualmente usa cast `as never`)
