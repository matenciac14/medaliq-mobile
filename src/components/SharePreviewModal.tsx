import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native'
import ViewShot from 'react-native-view-shot'
import * as Haptics from 'expo-haptics'
import ShareCard, { type ShareCardProps } from './ShareCard'
import { captureShareCard, shareImage, CARD_W, CARD_H } from '../lib/share'

const SCREEN_W = Dimensions.get('window').width
// Escalar la preview para que quepa en pantalla con margen
const PREVIEW_SCALE = (SCREEN_W - 80) / CARD_W

interface Props {
  visible: boolean
  onClose: () => void
  card: ShareCardProps
}

export default function SharePreviewModal({ visible, onClose, card }: Props) {
  const shotRef = useRef<ViewShot>(null)
  const [sharing, setSharing] = useState(false)

  async function handleShare() {
    if (sharing) return
    setSharing(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const uri = await captureShareCard(shotRef as never)
      if (!uri) throw new Error('capture failed')
      await shareImage(uri)
    } catch (err) {
      console.error('[SharePreviewModal] share error:', err)
    } finally {
      setSharing(false)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={s.container}>
        {/* Handle */}
        <View style={s.handle} />

        <Text style={s.title}>Compartir logro</Text>
        <Text style={s.subtitle}>Tu tarjeta aparecerá en Instagram, WhatsApp y más</Text>

        {/* Preview escalada — el ViewShot captura al tamaño real */}
        <View style={s.previewWrapper}>
          <View
            style={{
              width: CARD_W * PREVIEW_SCALE,
              height: CARD_H * PREVIEW_SCALE,
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            {/* Contenedor de captura — renderiza al tamaño real fuera de la escala */}
            <View
              style={{
                width: CARD_W,
                height: CARD_H,
                transform: [{ scale: PREVIEW_SCALE }],
                transformOrigin: 'top left',
              }}
            >
              <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
                <ShareCard {...card} />
              </ViewShot>
            </View>
          </View>
        </View>

        {/* Acciones */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, sharing && s.btnDisabled]}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={s.btnIcon}>↑</Text>
                <Text style={s.btnPrimaryText}>Compartir</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={onClose}>
            <Text style={s.btnSecondaryText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#1e3a5f',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
  },
  previewWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Sombra sobre la preview
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginTop: 28,
  },
  btn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: '#ea580c',
  },
  btnSecondary: {
    backgroundColor: '#f1f5f9',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnIcon: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  btnPrimaryText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  btnSecondaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#64748b',
  },
})
