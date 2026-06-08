import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Lucide-compatible icons via expo vector icons
import { Ionicons } from '@expo/vector-icons'

export default function TabsLayout() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          paddingBottom: insets.bottom,
          height: 52 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Inter_500Medium',
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gym"
        options={{
          title: 'Gym',
          tabBarIcon: ({ color }) => (
            <Ionicons name="barbell-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-in',
          tabBarIcon: ({ color }) => (
            <Ionicons name="checkmark-circle-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
