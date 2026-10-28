import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'

const BENEFITS = [
  { icon: 'calendar-outline',     text: 'Plan de entrenamiento diseñado para ti' },
  { icon: 'nutrition-outline',    text: 'Guía nutricional personalizada' },
  { icon: 'chatbubble-outline',   text: 'Canal directo con tu entrenador' },
  { icon: 'trending-up-outline',  text: 'Seguimiento semanal con check-ins' },
  { icon: 'barbell-outline',      text: 'Rutinas de gym con progresión de cargas' },
  { icon: 'analytics-outline',    text: 'Métricas y ajustes automáticos' },
]

const HOW_IT_WORKS = [
  { step: '1', title: 'El coach te invita',   desc: 'Recibes un código de acceso de tu entrenador.' },
  { step: '2', title: 'Completas tu perfil',  desc: 'Datos físicos para que el coach personalice tu plan.' },
  { step: '3', title: 'El coach te activa',   desc: 'Accedes a todas las features Pro incluidas en el plan.' },
]

export default function FindCoachScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={['#1e3a5f', '#2d5a8e']}
          style={{ paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: 24 }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginBottom: 20, alignSelf: 'flex-start', padding: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          <Text style={{ fontSize: 28, fontFamily: 'Inter_900Black', color: 'white', textAlign: 'center' }}>
            🎯 Encuentra tu{'\n'}entrenador
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
            Entrena con guía experta.{'\n'}Plan personalizado, nutrición y seguimiento — incluido en el plan del coach.
          </Text>
        </LinearGradient>

        {/* Benefits */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Con un coach tienes
          </Text>
          <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#f8fafc' }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={b.icon as any} size={18} color="#1e3a5f" />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#1e293b' }}>{b.text}</Text>
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
              </View>
            ))}
          </View>
        </View>

        {/* Price callout */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <View style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="pricetag-outline" size={20} color="#f97316" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#1e3a5f' }}>
                $0 para ti como atleta
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#78350f', marginTop: 2, lineHeight: 18 }}>
                El acceso está incluido en el plan de tu coach. No necesitas suscribirte.
              </Text>
            </View>
          </View>
        </View>

        {/* How it works */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Cómo funciona
          </Text>
          <View style={{ gap: 10 }}>
            {HOW_IT_WORKS.map((s) => (
              <View key={s.step} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: 'white' }}>{s.step}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1e293b' }}>{s.title}</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#64748b', marginTop: 2, lineHeight: 18 }}>{s.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Coming soon marketplace */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
            <Ionicons name="storefront-outline" size={32} color="#cbd5e1" style={{ marginBottom: 10 }} />
            <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: '#374151', textAlign: 'center' }}>
              Marketplace de entrenadores
            </Text>
            <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 240 }}>
              Próximamente podrás buscar y conectar con entrenadores directamente desde la app.
            </Text>
            <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 14 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#64748b' }}>Próximamente</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 4 }}
        >
          <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: '#94a3b8' }}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
