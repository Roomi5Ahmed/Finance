import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useAuth } from '../../lib/auth'
import { Colors, BorderRadius } from '../../constants/theme'

export default function SignUpScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const { error } = await signUp(email, password)
    setLoading(false)
    if (error) {
      Alert.alert('Sign Up Failed', error.message || 'Could not create account')
    } else {
      router.replace('/onboarding/step1')
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
            Create account
          </Text>
          <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 13, color: Colors.muted, marginTop: 8, letterSpacing: 0.5 }}>
            Start tracking your finances
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

          <View>
            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Confirm Password
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
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
            onPress={handleSignUp}
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
              {loading ? 'Creating account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: Colors.muted, fontSize: 14 }}>Already have an account? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: '600' }}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
