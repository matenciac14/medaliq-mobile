import { useState, useEffect } from 'react'
import {
  Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiFetch } from '../api/client'
import type { FoodItem } from '../api/nutrition'

type BarcodeResult =
  | { source: 'db'; food: FoodItem }
  | { source: 'openfoodfacts'; needsConfirmation: true; suggestion: OffSuggestion }
  | { source: 'not_found'; barcode: string }

type OffSuggestion = {
  barcode: string; name: string
  kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number
  fiberPer100g?: number; servingG?: number; servingLabel?: string; country?: string
}

type Props = {
  visible: boolean
  onClose: () => void
  onFoodFound: (food: FoodItem) => void
  onNotFound: (barcode: string) => void
}

export default function BarcodeScannerModal({ visible, onClose, onFoodFound, onNotFound }: Props) {
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanning, setScanning] = useState(true)
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<OffSuggestion | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [lastCode, setLastCode] = useState<string | null>(null)

  // Reset al abrir
  useEffect(() => {
    if (visible) {
      setScanning(true)
      setLoading(false)
      setSuggestion(null)
      setLastCode(null)
    }
  }, [visible])

  async function handleBarcode({ data }: { data: string }) {
    if (!scanning || loading || data === lastCode) return
    setLastCode(data)
    setScanning(false)
    setLoading(true)

    try {
      const res = await apiFetch<BarcodeResult>(
        `/api/mobile/nutrition/foods/barcode?code=${encodeURIComponent(data)}`
      )

      if (res.source === 'db') {
        onFoodFound(res.food)
        onClose()
      } else if (res.source === 'openfoodfacts' && res.needsConfirmation) {
        setSuggestion(res.suggestion)
      } else {
        onNotFound(data)
        onClose()
      }
    } catch {
      // 404 → no encontrado
      onNotFound(data)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function confirmSuggestion() {
    if (!suggestion) return
    setConfirming(true)
    try {
      const res = await apiFetch<{ food: FoodItem }>('/api/mobile/nutrition/foods/barcode', {
        method: 'POST',
        body: suggestion,
      })
      onFoodFound(res.food)
      onClose()
    } catch {
      // Si falla la creación, igual abrimos con la data de OFF
      onFoodFound({
        id: '', // temporal — no se puede loggear sin id, pero el modal mostrará los datos
        name:           suggestion.name,
        kcalPer100g:    suggestion.kcalPer100g,
        proteinPer100g: suggestion.proteinPer100g,
        carbsPer100g:   suggestion.carbsPer100g,
        fatPer100g:     suggestion.fatPer100g,
        fiberPer100g:   suggestion.fiberPer100g ?? null,
        servingG:       suggestion.servingG ?? 100,
        servingLabel:   suggestion.servingLabel ?? '100g',
        category:       'OTHER',
      })
      onClose()
    } finally {
      setConfirming(false)
    }
  }

  if (!visible) return null

  if (!permission) {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color="#1e3a5f" />
        </View>
      </Modal>
    )
  }

  if (!permission.granted) {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={[styles.center, { paddingTop: insets.top + 20, paddingHorizontal: 32 }]}>
          <Text style={styles.title}>Necesitamos acceso a tu cámara</Text>
          <Text style={styles.subtitle}>Para escanear códigos de barras de alimentos.</Text>
          <TouchableOpacity style={styles.btn} onPress={requestPermission}>
            <Text style={styles.btnText}>Permitir cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        {/* Cámara con detección de barcode */}
        {scanning && !suggestion && (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={handleBarcode}
          />
        )}

        {/* Overlay con visor */}
        {scanning && !loading && !suggestion && (
          <>
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
            {/* Visor central */}
            <View style={styles.viewfinder} />
            <View style={{ position: 'absolute', top: insets.top + 16, left: 0, right: 0, alignItems: 'center' }}>
              <Text style={styles.scanHint}>Apunta al código de barras del producto</Text>
            </View>
          </>
        )}

        {/* Loading */}
        {loading && (
          <View style={[StyleSheet.absoluteFillObject, styles.center, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
            <ActivityIndicator color="white" size="large" />
            <Text style={{ color: 'white', marginTop: 12, fontSize: 14 }}>Buscando alimento...</Text>
          </View>
        )}

        {/* Confirmación de OFF */}
        {suggestion && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f8fafc', justifyContent: 'flex-end' }]}>
            <View style={{ padding: 24, gap: 16 }}>
              <Text style={styles.title}>¿Es este el producto?</Text>
              <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 }}>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827' }}>{suggestion.name}</Text>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>Fuente: Open Food Facts · Código: {suggestion.barcode}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {[
                    ['Kcal', `${suggestion.kcalPer100g}`],
                    ['Prot', `${suggestion.proteinPer100g}g`],
                    ['Carbs', `${suggestion.carbsPer100g}g`],
                    ['Grasa', `${suggestion.fatPer100g}g`],
                  ].map(([label, val]) => (
                    <View key={label} style={{ backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 11, color: '#6b7280' }}>{label}</Text>
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827' }}>{val}</Text>
                    </View>
                  ))}
                </View>
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>por 100g</Text>
              </View>
              <TouchableOpacity
                onPress={confirmSuggestion}
                disabled={confirming}
                style={[styles.btn, { opacity: confirming ? 0.6 : 1 }]}
              >
                <Text style={styles.btnText}>{confirming ? 'Agregando...' : 'Sí, agregar este alimento'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setSuggestion(null); setScanning(true) }}
                style={{ alignItems: 'center', padding: 12 }}
              >
                <Text style={{ color: '#6b7280', fontSize: 14 }}>Escanear otro código</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingBottom: insets.bottom }}>
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Botón cerrar */}
        {!suggestion && (
          <TouchableOpacity
            onPress={onClose}
            style={{ position: 'absolute', top: insets.top + 12, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 }}
          >
            <Text style={{ color: 'white', fontSize: 18, lineHeight: 20 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  btn: { backgroundColor: '#1e3a5f', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 15, fontFamily: 'Inter_700Bold' },
  viewfinder: {
    position: 'absolute', top: '30%', left: '10%', right: '10%', height: '25%',
    borderRadius: 16,
    borderWidth: 2, borderColor: '#f97316',
    backgroundColor: 'transparent',
  },
  scanHint: {
    color: 'white', fontSize: 14, fontFamily: 'Inter_500Medium',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
})
