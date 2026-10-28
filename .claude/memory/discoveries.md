# Medaliq Mobile — Descubrimientos y Traps Técnicos

> Traps compartidos con web en: MEDALIQ/specs/_traps.spec.md y _mobile_mirror.spec.md (60+ pares)

## NO HACER
- NO AsyncStorage para datos sensibles — solo SecureStore
- NO simular con TextInput lo que el OS resuelve nativamente
- NO modificar store/auth.ts o api/client.ts sin leer seguridad.md
- NO modificar _layout.tsx (root o app) sin entender ciclo auth + push

## Patrones descubiertos en sesiones
<!-- El agente agrega aquí al hacer /wrap -->
