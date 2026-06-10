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
} from 'react-native'
import { useRouter } from 'expo-router'
import { apiFetch, saveToken } from '../../src/api/client'
import { useAuthStore } from '../../src/store/auth'
import type { SessionUser } from '../../src/api/auth'

export default function RegisterScreen() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Completa todos los campos.')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      // 1. Registrar
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: { name: name.trim(), email: email.trim().toLowerCase(), password },
        auth: false,
      })

      // 2. Login para obtener token
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
      style={{ flex: 1, backgroundColor: '#1e3a5f' }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40, gap: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 16,
            backgroundColor: '#f97316',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: 'white', fontSize: 32, fontFamily: 'Inter_900Black', lineHeight: 36 }}>M</Text>
          </View>
          <Text style={{ color: 'white', fontSize: 24, fontFamily: 'Inter_900Black', letterSpacing: -0.5 }}>
            Crea tu cuenta
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
            Empieza tu trial gratuito de 30 días
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 12 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre completo"
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="words"
            autoCorrect={false}
            style={inputStyle}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={inputStyle}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña (mín. 6 caracteres)"
            placeholderTextColor="rgba(255,255,255,0.4)"
            secureTextEntry
            style={inputStyle}
          />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirmar contraseña"
            placeholderTextColor="rgba(255,255,255,0.4)"
            secureTextEntry
            style={inputStyle}
          />

          <TouchableOpacity
            onPress={handleRegister}
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
              : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Crear cuenta</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Login link */}
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
            ¿Ya tienes cuenta?{' '}
            <Text style={{ color: '#f97316', fontFamily: 'Inter_700Bold' }}>Inicia sesión</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const inputStyle = {
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 16,
  color: 'white' as const,
  fontSize: 16,
  fontFamily: 'Inter_400Regular',
}
