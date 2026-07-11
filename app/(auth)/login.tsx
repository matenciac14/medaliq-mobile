import { useState, useEffect } from 'react'
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
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { login, googleLogin } from '../../src/api/auth'
import { useAuthStore } from '../../src/store/auth'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  })

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token
      if (idToken) handleGoogleToken(idToken)
    } else if (response?.type === 'error') {
      setGoogleLoading(false)
      Alert.alert('Error', 'No se pudo iniciar sesión con Google.')
    } else if (response?.type === 'dismiss') {
      setGoogleLoading(false)
    }
  }, [response])

  async function handleGoogleToken(idToken: string) {
    try {
      const { user, needsRoleSelection } = await googleLogin(idToken)
      setUser(user)
      if (needsRoleSelection) {
        router.replace('/(auth)/select-role' as any)
      } else if (!user.onboardingCompleted) {
        router.replace('/(auth)/onboarding')
      } else {
        router.replace('/(app)/(tabs)/dashboard')
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo iniciar sesión con Google.')
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleGooglePress() {
    setGoogleLoading(true)
    try {
      promptAsync()
    } catch {
      setGoogleLoading(false)
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.')
      return
    }
    setLoading(true)
    try {
      const user = await login({ email: email.trim().toLowerCase(), password })
      setUser(user)
      if (!user.onboardingCompleted) {
        router.replace('/(auth)/onboarding')
      } else if (user.userPlan === 'INACTIVE') {
        router.replace('/(app)/upgrade')
      } else {
        router.replace('/(app)/(tabs)/dashboard')
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo iniciar sesión.')
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
      <View style={{ height: '40%', overflow: 'hidden' }}>
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
            Tu progreso continúa.
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
            Bienvenido de vuelta
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#64748b', textAlign: 'center', marginBottom: 28 }}>
            Ingresa tus datos para continuar
          </Text>

          {/* Form */}
          <View style={{ gap: 16 }}>
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={labelStyle}>Contraseña</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)} activeOpacity={0.7}>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#ea580c' }}>¿Olvidaste?</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                style={inputStyle}
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#1e3a5f',
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              marginTop: 24,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Iniciar sesión</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
            <Text style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'Inter_400Regular' }}>o</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
          </View>

          {/* Google */}
          <TouchableOpacity
            onPress={handleGooglePress}
            disabled={!request || googleLoading || loading}
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
              opacity: (!request || googleLoading || loading) ? 0.6 : 1,
            }}
          >
            {googleLoading
              ? <ActivityIndicator color="#1e3a5f" />
              : <Text style={{ color: '#374151', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>Continuar con Google</Text>
            }
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity onPress={() => router.replace('/(auth)/register')} activeOpacity={0.7} style={{ marginTop: 20 }}>
            <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
              ¿No tienes cuenta?{' '}
              <Text style={{ color: '#ea580c', fontFamily: 'Inter_700Bold' }}>Regístrate gratis →</Text>
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
