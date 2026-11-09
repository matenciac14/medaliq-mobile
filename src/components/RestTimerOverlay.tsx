import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Modal, Vibration } from 'react-native'
import * as Haptics from 'expo-haptics'

type Props = {
  visible: boolean
  seconds: number
  soundEnabled: boolean
  vibrationEnabled: boolean
  onDismiss: () => void
  onSkip: () => void
}

export default function RestTimerOverlay({
  visible,
  seconds,
  soundEnabled,
  vibrationEnabled,
  onDismiss,
  onSkip,
}: Props) {
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset countdown whenever seconds prop changes (new timer started)
  useEffect(() => {
    if (visible) setRemaining(seconds)
  }, [seconds, visible])

  useEffect(() => {
    if (!visible) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    let mounted = true
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          if (vibrationEnabled) Vibration.vibrate([0, 300, 100, 300])
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          if (mounted) onDismiss()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      mounted = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [visible, vibrationEnabled, onDismiss])

  function adjustTime(delta: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setRemaining(prev => Math.max(5, prev + delta))
  }

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const display = mins > 0
    ? `${mins}:${secs.toString().padStart(2, '0')}`
    : `${secs}s`

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: 28,
          padding: 32,
          width: '100%',
          alignItems: 'center',
          gap: 24,
        }}>
          {/* Label */}
          <Text style={{
            fontSize: 13,
            fontFamily: 'Inter_600SemiBold',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
          }}>
            Descanso
          </Text>

          {/* Circular countdown display */}
          <View style={{
            width: 148,
            height: 148,
            borderRadius: 74,
            borderWidth: 5,
            borderColor: '#f97316',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff7ed',
          }}>
            <Text style={{
              fontSize: 42,
              fontFamily: 'Inter_900Black',
              color: '#1e3a5f',
              letterSpacing: -1,
            }}>
              {display}
            </Text>
          </View>

          {/* Adjust buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => adjustTime(-15)}
              style={{
                backgroundColor: '#f3f4f6',
                borderRadius: 10,
                paddingHorizontal: 20,
                paddingVertical: 12,
              }}
            >
              <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#374151' }}>−15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => adjustTime(+15)}
              style={{
                backgroundColor: '#f3f4f6',
                borderRadius: 10,
                paddingHorizontal: 20,
                paddingVertical: 12,
              }}
            >
              <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#374151' }}>+15s</Text>
            </TouchableOpacity>
          </View>

          {/* Skip button */}
          <TouchableOpacity
            onPress={onSkip}
            style={{
              backgroundColor: '#f3f4f6',
              borderRadius: 12,
              paddingHorizontal: 32,
              paddingVertical: 14,
              width: '100%',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#374151' }}>
              Saltar descanso
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
