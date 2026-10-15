import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useAuth } from '../../lib/auth'
import { Colors, Spacing, BorderRadius } from '../../constants/theme'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password')
      return
    }
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      Alert.alert('Sign In Failed', error.message || 'Could not authenticate user')
    } else {
      router.replace('/(tabs)')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: Colors.background }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ marginBottom: 48 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: Colors.foreground, fontWeight: '700' }}>
            Welcome back
          </Text>
          <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 13, color: Colors.muted, marginTop: 8, letterSpacing: 0.5 }}>
            Sign in to your account
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.mutedDark}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={{
                backgroundColor: Colors.surface,
                borderWidth: 1,
                borderColor: Colors.borderLight,
                borderRadius: BorderRadius.input,
                padding: 14,
                color: Colors.foreground,
                fontSize: 15,
              }}
            />
          </View>

          <View>
            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.mutedDark}
              secureTextEntry
              style={{
                backgroundColor: Colors.surface,
                borderWidth: 1,
                borderColor: Colors.borderLight,
                borderRadius: BorderRadius.input,
                padding: 14,
                color: Colors.foreground,
                fontSize: 15,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            style={{
              backgroundColor: Colors.primary,
              borderRadius: BorderRadius.button,
              padding: 16,
              alignItems: 'center',
              marginTop: 8,
              opacity: loading ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#000', fontWeight: '600', fontSize: 15 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: Colors.muted, fontSize: 14 }}>Don't have an account? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: '600' }}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
