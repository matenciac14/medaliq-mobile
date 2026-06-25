import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { getMessagesMe, getMessages, sendMessage, markMessagesRead, type Msg, type MeInfo } from '../../src/api/messages'

const POLL_INTERVAL = 30_000

export default function MessagesScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const flatListRef = useRef<FlatList>(null)

  const [me, setMe] = useState<MeInfo | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  // Load coach info once
  useEffect(() => {
    getMessagesMe().then(setMe).catch(() => {})
  }, [])

  // Load messages + poll
  const loadMessages = useCallback(() => {
    if (!me?.coachId) return
    getMessages(me.coachId)
      .then(d => { setMsgs(d.messages); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [me?.coachId])

  useEffect(() => {
    if (!me?.coachId) return
    loadMessages()
    markMessagesRead(me.coachId).catch(() => {})
    const interval = setInterval(loadMessages, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [me?.coachId, loadMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (msgs.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [msgs.length])

  async function handleSend() {
    if (!input.trim() || sending || !me?.coachId) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSending(true)
    const text = input.trim()
    setInput('')
    try {
      const { message } = await sendMessage(me.coachId, text)
      setMsgs(prev => [...prev, message])
    } catch {
      setInput(text) // restore on failure
    } finally {
      setSending(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────
  if (!me) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#1e3a5f" />
      </View>
    )
  }

  // ── No coach ─────────────────────────────────────────────────
  if (!me.coachId) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
        <View style={{
          backgroundColor: '#1e3a5f', paddingTop: insets.top + 8, paddingBottom: 16,
          paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: 'white' }}>Mensajes</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>💬</Text>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#111827', marginBottom: 8 }}>
            Sin coach asignado
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
            La mensajería está disponible cuando tienes un coach.
          </Text>
        </View>
      </View>
    )
  }

  // ── Chat ──────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f1f5f9' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={{
        backgroundColor: '#1e3a5f', paddingTop: insets.top + 8, paddingBottom: 16,
        paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontFamily: 'Inter_700Bold', color: 'white' }}>Mensajes</Text>
          {me.coachName ? (
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_400Regular' }}>
              Conversación con {me.coachName}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={msgs}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1, justifyContent: msgs.length === 0 ? 'center' : undefined }}
        ListEmptyComponent={
          loaded ? (
            <Text style={{ textAlign: 'center', color: '#9ca3af', fontFamily: 'Inter_400Regular', fontSize: 14 }}>
              Aún no hay mensajes. ¡Di hola!
            </Text>
          ) : (
            <ActivityIndicator color="#1e3a5f" />
          )
        }
        renderItem={({ item: m }) => {
          const isMe = m.fromId === me.id
          return (
            <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <View style={{
                maxWidth: '78%', borderRadius: 18,
                borderBottomRightRadius: isMe ? 4 : 18,
                borderBottomLeftRadius: isMe ? 18 : 4,
                paddingHorizontal: 14, paddingVertical: 10,
                backgroundColor: isMe ? '#1e3a5f' : 'white',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
              }}>
                <Text style={{ fontSize: 14, color: isMe ? 'white' : '#111827', fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
                  {m.content}
                </Text>
                <Text style={{
                  fontSize: 10, marginTop: 4, fontFamily: 'Inter_400Regular',
                  color: isMe ? 'rgba(255,255,255,0.5)' : '#9ca3af',
                  textAlign: 'right',
                }}>
                  {new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {new Date(m.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </View>
          )
        }}
      />

      {/* Input */}
      <View style={{
        flexDirection: 'row', alignItems: 'flex-end', gap: 10,
        paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 10,
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb',
      }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#9ca3af"
          multiline
          style={{
            flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 22,
            paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
            fontFamily: 'Inter_400Regular', color: '#111827',
            backgroundColor: '#f9fafb', maxHeight: 120,
          }}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: !input.trim() || sending ? '#e5e7eb' : '#1e3a5f',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {sending
            ? <ActivityIndicator size="small" color="white" />
            : <Ionicons name="send" size={18} color={!input.trim() ? '#9ca3af' : 'white'} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
