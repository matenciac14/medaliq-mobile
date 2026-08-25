import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { useAuthStore } from '../../src/store/auth'
import { getMe } from '../../src/api/auth'
import { apiFetch } from '../../src/api/client'

type PriceInfo = {
  priceUSD: number
  priceCOP: number
  trmDate: string | null
}

const FEATURES_FREE = [
  { label: 'Log de sesiones de running', included: true },
  { label: 'Registro de gym y fuerza',   included: true },
  { label: 'Nutrición (log de comidas)', included: true },
  { label: 'Plan adaptativo',             included: false },
  { label: 'Check-in semanal',            included: false },
  { label: 'Métricas de progreso',        included: false },
]

const FEATURES_PRO = [
  { label: 'Log de sesiones de running', included: true },
  { label: 'Registro de gym y fuerza',   included: true },
  { label: 'Nutrición sincronizada',     included: true },
  { label: 'Plan adaptativo',            included: true },
  { label: 'Check-in semanal',           included: true },
  { label: 'Métricas de progreso',       included: true },
]

type CheckoutResult = { checkoutUrl: string; sessionId: string }

// Polls getMe hasta que features.plan sea true o se agoten los intentos
async function pollForProFeatures(maxAttempts = 6, intervalMs = 2000): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs))
    try {
      const fresh = await getMe()
      if (fresh.features.plan) return true
    } catch { /* continuar */ }
  }
  return false
}

export default function PricingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [pollingMsg, setPollingMsg] = useState<string | null>(null)
  const [priceInfo, setPriceInfo] = useState<PriceInfo>({ priceUSD: 9.99, priceCOP: 0, trmDate: null })

  useEffect(() => {
    apiFetch<PriceInfo>('/api/mobile/billing/prices')
      .then(setPriceInfo)
      .catch(() => { /* usar valores por defecto */ })
  }, [])

  async function handleActivatePro() {
    setLoading(true)
    try {
      const result = await apiFetch<CheckoutResult>('/api/billing/athlete/checkout', { method: 'POST' })

      // Abre in-app browser (SFSafariViewController en iOS, Chrome Custom Tab en Android)
      await WebBrowser.openBrowserAsync(result.checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: '#1e3a5f',
      })

      // Después de que el browser se cierra (pago hecho o cancelado):
      // Polliar hasta que las features se actualicen en DB
      setPollingMsg('Verificando tu pago…')
      const upgraded = await pollForProFeatures()

      if (upgraded) {
        const fresh = await getMe()
        setUser(fresh)
        router.replace('/(app)/(tabs)/dashboard')
      } else {
        setPollingMsg(null)
        Alert.alert(
          'Verificando pago',
          'Si completaste el pago, puede tardar unos segundos en activarse. Cierra y vuelve a abrir la app.',
          [{ text: 'OK', onPress: () => router.back() }]
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar el pago'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
      setPollingMsg(null)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={['#1e3a5f', '#2d5a8e']}
          style={{ paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: 24 }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginBottom: 20, alignSelf: 'flex-start', padding: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          <Text style={{ color: 'white', fontSize: 26, fontFamily: 'Inter_900Black', textAlign: 'center' }}>
            Elige tu plan
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            Sigue entrenando gratis o activa Pro{'\n'}para planes adaptativos y más.
          </Text>
        </LinearGradient>

        {/* Comparison table */}
        <View style={{ marginHorizontal: 16, marginTop: -1 }}>

          {/* FREE column */}
          <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
            <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#374151' }}>Free</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#374151' }}>$0</Text>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', paddingBottom: 3 }}>/mes</Text>
              </View>
            </View>
            {FEATURES_FREE.map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#f8fafc', gap: 10 }}>
                <Ionicons
                  name={f.included ? 'checkmark-circle' : 'close-circle-outline'}
                  size={18}
                  color={f.included ? '#22c55e' : '#d1d5db'}
                />
                <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: f.included ? '#374151' : '#9ca3af' }}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>

          {/* PRO column */}
          <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: '#f97316', shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 }}>
            <View style={{ backgroundColor: '#fff7ed', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#fed7aa', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>Pro</Text>
                <View style={{ backgroundColor: '#f97316', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: 'white' }}>RECOMENDADO</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                  <Text style={{ fontSize: 22, fontFamily: 'Inter_900Black', color: '#1e3a5f' }}>$9.99</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9ca3af', paddingBottom: 3 }}>/mes</Text>
                </View>
                {priceInfo.priceCOP > 0 && (
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9ca3af' }}>
                    ~${priceInfo.priceCOP.toLocaleString('es-CO')} COP
                  </Text>
                )}
              </View>
            </View>
            {FEATURES_PRO.map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#fff7ed', gap: 10 }}>
                <Ionicons name="checkmark-circle" size={18} color="#f97316" />
                <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#1e293b' }}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={{ marginHorizontal: 16, marginTop: 20, gap: 10 }}>
          {pollingMsg ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 }}>
              <ActivityIndicator color="#f97316" />
              <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: '#64748b' }}>{pollingMsg}</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleActivatePro}
              disabled={loading}
              activeOpacity={0.85}
              style={{ backgroundColor: loading ? '#9ca3af' : '#f97316', borderRadius: 14, paddingVertical: 18, alignItems: 'center' }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>
                  {priceInfo.priceCOP > 0
                    ? `Activar Pro — $${priceInfo.priceCOP.toLocaleString('es-CO')} COP/mes`
                    : 'Activar Pro — $9.99/mes'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          <Text style={{ textAlign: 'center', fontSize: 12, fontFamily: 'Inter_400Regular', color: '#94a3b8', lineHeight: 18 }}>
            Pago seguro procesado por Wompi.{'\n'}Cancela cuando quieras.
          </Text>
          {priceInfo.trmDate && (
            <Text style={{ textAlign: 'center', fontSize: 11, fontFamily: 'Inter_400Regular', color: '#cbd5e1', marginTop: 2 }}>
              TRM: $9.99 USD = ~${priceInfo.priceCOP.toLocaleString('es-CO')} COP ({priceInfo.trmDate})
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
