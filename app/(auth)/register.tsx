import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { apiFetch, saveToken } from '../../src/api/client'
import { useAuthStore } from '../../src/store/auth'
import type { SessionUser } from '../../src/api/auth'

export default function RegisterScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { setUser } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Completa todos los campos.')
      return
    }
    if (password.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: { name: name.trim(), email: email.trim().toLowerCase(), password },
        auth: false,
      })

      const res = await apiFetch<{ token: string; user: SessionUser }>(
        '/api/mobile/auth/login',
        { method: 'POST', body: { email: email.trim().toLowerCase(), password }, auth: false }
      )
      await saveToken(res.token)
      setUser(res.user)
      router.replace('/(auth)/onboarding')
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#0f1e30' }}
    >
      {/* Hero top */}
      <View style={{ height: '35%', overflow: 'hidden' }}>
        <Image
          source={require('../../assets/hero-auth.jpg')}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(15,30,48,0.35)', 'rgba(15,30,48,0.55)', 'rgba(15,30,48,0.85)']}
          locations={[0, 0.5, 1]}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          }}
        />
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: insets.top,
        }}>
          <Text style={{ fontSize: 32, fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.5 }}>
            Medal<Text style={{ color: '#f97316' }}>iq</Text>
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>
            Empieza gratis, sin tarjeta.
          </Text>
        </View>
      </View>

      {/* Bottom sheet */}
      <View style={{
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -20,
        paddingTop: 12,
      }}>
        {/* Handle */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 24, fontFamily: 'Inter_900Black', color: '#0f172a', textAlign: 'center', marginBottom: 4 }}>
            Crea tu cuenta
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#64748b', textAlign: 'center', marginBottom: 28 }}>
            Solo toma un minuto
          </Text>

          {/* Form */}
          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={labelStyle}>Nombre</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                autoCorrect={false}
                style={inputStyle}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={labelStyle}>Correo electrónico</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="tu@correo.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={inputStyle}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={labelStyle}>Contraseña</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                style={inputStyle}
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#f97316',
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              marginTop: 24,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Crear cuenta gratis</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
            <Text style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'Inter_400Regular' }}>o</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
          </View>

          {/* Google placeholder */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={{
              borderWidth: 1.5,
              borderColor: '#e2e8f0',
              borderRadius: 14,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <Text style={{ color: '#374151', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>Continuar con Google</Text>
          </TouchableOpacity>

          {/* Login link */}
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7} style={{ marginTop: 20 }}>
            <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
              ¿Ya tienes cuenta?{' '}
              <Text style={{ color: '#1e3a5f', fontFamily: 'Inter_700Bold' }}>Inicia sesión →</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

const labelStyle = {
  fontSize: 13,
  fontFamily: 'Inter_600SemiBold',
  color: '#374151',
} as const

const inputStyle = {
  backgroundColor: '#f8fafc',
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: '#e2e8f0',
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  fontFamily: 'Inter_400Regular',
  color: '#0f172a',
} as const
