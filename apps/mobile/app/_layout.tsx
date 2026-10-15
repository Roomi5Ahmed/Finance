import '../global.css'
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter'
import { Roboto_900Black } from '@expo-google-fonts/roboto'
import { AuthProvider, useAuth } from '../lib/auth'
import { Colors } from '../constants/theme'

function RootLayoutNav() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, loading, segments])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Roboto_900Black,
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootLayoutNav />
    </AuthProvider>
  )
}
