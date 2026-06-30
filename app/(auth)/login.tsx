import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { login, googleLogin } from '../../src/api/auth'
import { useAuthStore } from '../../src/store/auth'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
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
    promptAsync()
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
      style={{ flex: 1, backgroundColor: '#1e3a5f' }}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 24 }}>

        {/* Logo */}
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 18,
            backgroundColor: '#f97316',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: 'white', fontSize: 36, fontFamily: 'Inter_900Black', lineHeight: 40 }}>M</Text>
          </View>
          <Text style={{ color: 'white', fontSize: 28, fontFamily: 'Inter_900Black', letterSpacing: -0.5 }}>
            Medaliq
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'Inter_400Regular' }}>
            Coaching deportivo inteligente
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 12 }}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 16,
              color: 'white',
              fontSize: 16,
              fontFamily: 'Inter_400Regular',
            }}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor="rgba(255,255,255,0.4)"
            secureTextEntry
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 16,
              color: 'white',
              fontSize: 16,
              fontFamily: 'Inter_400Regular',
            }}
          />

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#f97316',
              borderRadius: 14,
              paddingVertical: 18,
              alignItems: 'center',
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Divisor */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'Inter_400Regular' }}>o continúa con</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </View>

        {/* Google */}
        <TouchableOpacity
          onPress={handleGooglePress}
          disabled={!request || googleLoading || loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: 'white',
            borderRadius: 14,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: (!request || googleLoading || loading) ? 0.7 : 1,
          }}
        >
          {googleLoading
            ? <ActivityIndicator color="#1e3a5f" />
            : <>
                <Text style={{ fontSize: 18, lineHeight: 22 }}>🇬</Text>
                <Text style={{ color: '#1e3a5f', fontSize: 15, fontFamily: 'Inter_700Bold' }}>
                  Continuar con Google
                </Text>
              </>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(auth)/register')} activeOpacity={0.7}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
            ¿No tienes cuenta?{' '}
            <Text style={{ color: '#f97316', fontFamily: 'Inter_700Bold' }}>Crear cuenta</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot-password' as any)}
          activeOpacity={0.7}
        >
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
            ¿Olvidaste tu contraseña?{' '}
            <Text style={{ color: '#f97316', fontFamily: 'Inter_600SemiBold' }}>Restablecer</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
