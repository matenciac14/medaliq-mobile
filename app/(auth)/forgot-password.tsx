import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { apiFetch } from '../../src/api/client'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email.trim()) return
    setError('')
    setLoading(true)
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
        auth: false,
      })
      setSent(true)
    } catch {
      setError('Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  } as const

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#1e3a5f' }}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 24 }}>

        {/* Logo */}
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontSize: 36, fontFamily: 'Inter_900Black', lineHeight: 40 }}>M</Text>
          </View>
          <Text style={{ color: 'white', fontSize: 28, fontFamily: 'Inter_900Black', letterSpacing: -0.5 }}>Medaliq</Text>
        </View>

        {sent ? (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 48 }}>📬</Text>
            <Text style={{ color: 'white', fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' }}>
              Revisa tu correo
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 }}>
              Si existe una cuenta con ese correo, recibirás un link para crear una nueva contraseña en los próximos minutos.
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7} style={{ marginTop: 8 }}>
              <Text style={{ color: '#f97316', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                ← Volver al inicio de sesión
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: 'white', fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' }}>
                ¿Olvidaste tu contraseña?
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
                Ingresa tu correo y te enviaremos un link para restablecerla.
              </Text>
            </View>

            {!!error && (
              <View style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 10, padding: 12 }}>
                <Text style={{ color: '#fca5a5', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>{error}</Text>
              </View>
            )}

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
            />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || !email.trim()}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#f97316',
                borderRadius: 14,
                paddingVertical: 18,
                alignItems: 'center',
                opacity: loading || !email.trim() ? 0.6 : 1,
              }}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>Enviar link</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
                ← Volver al inicio de sesión
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}
