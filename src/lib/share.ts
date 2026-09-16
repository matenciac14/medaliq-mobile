import * as Sharing from 'expo-sharing'
import { captureRef } from 'react-native-view-shot'
import { Alert } from 'react-native'
import type { RefObject } from 'react'

// Dimensiones de la tarjeta en puntos (pt).
// En dispositivos 3x (iPhone Pro) → 1080×1920px nativo, perfecto para Instagram Stories.
// En 2x → 720×1280px — aceptable para WhatsApp y Stories.
export const CARD_W = 360
export const CARD_H = 640

/**
 * Captura un componente React Native como PNG y retorna el URI del archivo temporal.
 * Usa la densidad de pantalla nativa del dispositivo — no se especifica width/height
 * para evitar upscaling con pérdida de calidad.
 */
export async function captureShareCard(ref: RefObject<unknown>): Promise<string | null> {
  try {
    const uri = await captureRef(ref, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    })
    return uri
  } catch (err) {
    console.error('[share] captureShareCard failed:', err)
    return null
  }
}

/**
 * Abre el share sheet nativo del OS con la imagen capturada.
 * En iOS: AirDrop, Instagram, WhatsApp, Fotos, etc.
 * En Android: equivalente nativo.
 */
export async function shareImage(uri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync()
  if (!available) {
    Alert.alert('Compartir no disponible', 'Tu dispositivo no soporta esta función.')
    return
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: 'Compartir tu logro',
    UTI: 'public.png',
  })
}
