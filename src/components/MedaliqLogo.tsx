/**
 * MedaliqLogo — logo completo para React Native
 *
 * variant="dark"  → sobre fondos oscuros (navy, foto oscura): símbolo sin caja, chevrons naranja + blanco, texto blanco
 * variant="light" → sobre fondos claros: símbolo con caja navy, texto navy
 */

import { View, Text } from 'react-native'
import Svg, { Rect, Polygon } from 'react-native-svg'

interface MedaliqLogoProps {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
}

const sizes = {
  sm: { icon: 24, fontSize: 18, gap: 8 },
  md: { icon: 32, fontSize: 24, gap: 10 },
  lg: { icon: 44, fontSize: 32, gap: 12 },
}

export function MedaliqLogo({
  variant = 'light',
  size = 'md',
  showWordmark = true,
}: MedaliqLogoProps) {
  const { icon: iconSize, fontSize, gap } = sizes[size]

  const wordmarkColor = variant === 'dark' ? 'white' : '#1e3a5f'
  const accentColor = variant === 'dark' ? '#ea580c' : '#c2410c'

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      {variant === 'dark' ? (
        // Sobre fondo oscuro: símbolo solo (sin caja navy)
        <Svg width={iconSize} height={iconSize} viewBox="0 0 120 120">
          <Polygon points="60,26 92,58 74,58 60,44 46,58 28,58" fill="#ea580c" />
          <Polygon points="60,58 92,90 74,90 60,76 46,90 28,90" fill="#f7f6f4" />
        </Svg>
      ) : (
        // Sobre fondo claro: caja navy redondeada con símbolo
        <Svg width={iconSize} height={iconSize} viewBox="0 0 120 120">
          <Rect width="120" height="120" rx="24" fill="#1e3a5f" />
          <Polygon points="60,26 92,58 74,58 60,44 46,58 28,58" fill="#ea580c" />
          <Polygon points="60,58 92,90 74,90 60,76 46,90 28,90" fill="#f7f6f4" />
        </Svg>
      )}

      {showWordmark && (
        <Text
          style={{
            fontSize,
            fontFamily: 'Inter_900Black',
            color: wordmarkColor,
            letterSpacing: -0.5,
          }}
        >
          Medal<Text style={{ color: accentColor }}>IQ</Text>
        </Text>
      )}
    </View>
  )
}
