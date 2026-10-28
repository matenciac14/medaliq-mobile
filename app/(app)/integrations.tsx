import { View, Text, Switch, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useState, useEffect } from 'react'
import { useHealthKit } from '../../src/hooks/useHealthKit'
import { isSyncEnabled, setSyncEnabled } from '../../src/services/healthkit.service'

export default function IntegrationsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { authorized, loading, requestAuthorization } = useHealthKit()
  const [hkEnabled, setHkEnabled] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    isSyncEnabled().then(setHkEnabled)
  }, [])

  async function handleToggleHealthKit(value: boolean) {
    if (Platform.OS !== 'ios') {
      Alert.alert('Solo iOS', 'Apple Health solo está disponible en iPhone.')
      return
    }

    setToggling(true)
    try {
      if (value && !authorized) {
        await requestAuthorization()
      }
      await setSyncEnabled(value)
      setHkEnabled(value)
    } finally {
      setToggling(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      {/* Header */}
      <View style={{
        backgroundColor: '#1e3a5f',
        paddingTop: insets.top + 12,
        paddingBottom: 20,
        paddingHorizontal: 20,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>Integraciones</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>
          Importa actividades automáticamente
        </Text>
      </View>

      <View style={{ padding: 16, gap: 12 }}>

        {/* Apple Health */}
        {Platform.OS === 'ios' && (
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="heart" size={22} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 16, color: '#111827' }}>Apple Health</Text>
                <Text style={{ color: '#6b7280', fontSize: 13 }}>
                  {hkEnabled && authorized
                    ? 'Sincronizando entrenamientos automáticamente'
                    : 'Importa workouts, FC y sueño de tu Apple Watch'}
                </Text>
              </View>
              <Switch
                value={hkEnabled}
                onValueChange={handleToggleHealthKit}
                disabled={toggling}
                trackColor={{ true: '#f97316' }}
                thumbColor="white"
              />
            </View>

            {hkEnabled && authorized && (
              <View style={{
                backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10,
                flexDirection: 'row', gap: 6, alignItems: 'center',
              }}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={{ color: '#15803d', fontSize: 12, fontWeight: '600' }}>
                  Activo — los entrenamientos se importan al abrir la app
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Strava — deeplink a web */}
        <View style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 16,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 44, height: 44, borderRadius: 12,
              backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 18 }}>S</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: '#111827' }}>Strava</Text>
              <Text style={{ color: '#6b7280', fontSize: 13 }}>
                Conecta desde el perfil web en medaliq.com
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#9ca3af" />
          </View>
        </View>

        {/* Garmin */}
        <View style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 16,
          opacity: 0.5,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 44, height: 44, borderRadius: 12,
              backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 18 }}>G</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: '#111827' }}>Garmin</Text>
              <Text style={{ color: '#6b7280', fontSize: 13 }}>Proximamente</Text>
            </View>
          </View>
        </View>

      </View>
    </ScrollView>
  )
}

