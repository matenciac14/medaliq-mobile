# Medaliq Mobile

App nativa iOS + Android para [Medaliq](https://medaliq.com) — coaching deportivo con AI para LatAm.

## Stack

- **React Native + Expo** (managed workflow ~54)
- **Expo Router v4** — file-based routing
- **NativeWind v4** — Tailwind en React Native
- **TanStack Query v5** — server state
- **Zustand v4** — auth/global state
- **expo-secure-store** — JWT storage

## Requisitos

- Node 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- App **Expo Go** en tu celular para desarrollo

## Configuración local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# Editar EXPO_PUBLIC_API_URL con la URL del backend

# 3. Levantar dev server
npx expo start
```

Escaneá el QR con Expo Go (Android) o la cámara (iOS).

## Estructura

```
app/
  index.tsx                    ← boot/splash
  _layout.tsx                  ← root layout
  (auth)/
    login.tsx
  (app)/
    (tabs)/
      dashboard.tsx            ← home
      plan.tsx                 ← plan semanal
      gym.tsx                  ← sesión del día
      checkin.tsx              ← check-in semanal
      profile.tsx              ← perfil y logout
    gym-session.tsx            ← tracker activo de gym
    gym-history.tsx            ← historial de sesiones gym
    log.tsx                    ← log sesión de resistencia
    edit-session.tsx           ← editar sesión planificada
    progress.tsx               ← gráficas peso/FC/adherencia
    upgrade.tsx                ← paywall / upgrade a Pro
    messages.tsx               ← chat atleta→coach
    coach-inbox.tsx            ← lista atletas del coach (solo COACH)
    coach-chat.tsx             ← chat coach→atleta (solo COACH)
src/
  api/                         ← fetch wrappers (client, auth, dashboard, gym, plan, checkin, messages, coach)
  store/                       ← Zustand (auth)
  hooks/                       ← useAuth, useBootstrap
```

## Build / Deploy

```bash
# Preview APK (Android)
eas build --profile preview --platform android

# Production
eas build --profile production

# Submit a stores
eas submit
```

## Backend

Consume los endpoints REST de `medaliq.com`. Ver [CLAUDE.md](./CLAUDE.md) para lista completa de endpoints mobile.

---

Hecho en Colombia 🇨🇴 · [medaliq.com](https://medaliq.com)
