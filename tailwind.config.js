/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1e3a5f',
          'navy-mid': '#2d5a8e',
          orange: '#f97316',
          'orange-dark': '#ea6c0b',
        },
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
        black: ['Inter_900Black'],
      },
    },
  },
  plugins: [],
}
