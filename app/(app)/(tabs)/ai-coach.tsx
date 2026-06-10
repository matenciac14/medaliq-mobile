import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { sendChatMessage, type ChatMessage } from '../../../src/api/ai'
import { useAuthStore } from '../../../src/store/auth'
import UpgradeWall from '../../../src/components/UpgradeWall'

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: '¡Hola! Soy tu AI Coach. Puedo ayudarte con tu plan de entrenamiento, nutrición, técnica y cualquier pregunta deportiva. ¿En qué te ayudo hoy?',
}

export default function AiCoachTab() {
  const { user } = useAuthStore()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [messages, loading])

  if (!user?.features?.aiCoach) {
    return <UpgradeWall icon="⚡" title="AI Coach" description="Chatea con tu coach virtual para recibir guía personalizada de entrenamiento y nutrición." />
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const conversationMsgs = updated.filter((_, i) => !(i === 0 && updated[0].role === 'assistant'))
      const res = await sendChatMessage(conversationMsgs)
      setMessages(prev => [...prev, { role: 'assistant', content: res.content }])
      setRemaining(res.remaining === 999999 ? null : res.remaining)
    } catch (err: any) {
      if (err.message?.includes('LIMIT_REACHED')) {
        Alert.alert(
          'Límite alcanzado',
          'Has usado todos tus mensajes del mes. Actualiza tu plan para continuar.',
          [{ text: 'OK' }]
        )
      } else if (err.message?.includes('no está activado')) {
        Alert.alert('No disponible', 'El AI Coach no está activado en tu cuenta.')
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Ocurrió un error. Intenta de nuevo.' }])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#1e3a5f',
        paddingTop: insets.top + 12,
        paddingBottom: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        <View style={{
          width: 36, height: 36, borderRadius: 10, backgroundColor: '#f97316',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 18 }}>⚡</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' }}>AI Coach</Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            {remaining !== null ? `${remaining} msgs restantes` : 'Sin límite'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}
          >
            <View style={{
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: msg.role === 'user' ? '#f97316' : 'white',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 3,
              elevation: 2,
              borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
              borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
            }}>
              <Text style={{
                fontSize: 15,
                fontFamily: 'Inter_400Regular',
                color: msg.role === 'user' ? 'white' : '#1e293b',
                lineHeight: 22,
              }}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
            <ActivityIndicator color="#1e3a5f" size="small" />
            <Text style={{ color: '#64748b', fontSize: 13, fontFamily: 'Inter_400Regular' }}>Escribiendo...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          gap: 10,
        }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Escríbele al coach..."
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={2000}
            style={{
              flex: 1,
              borderRadius: 22,
              backgroundColor: '#f1f5f9',
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
              fontSize: 15,
              fontFamily: 'Inter_400Regular',
              color: '#0f172a',
              maxHeight: 100,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || loading}
            activeOpacity={0.85}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: input.trim() && !loading ? '#1e3a5f' : '#e2e8f0',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18, color: input.trim() && !loading ? 'white' : '#94a3b8' }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
