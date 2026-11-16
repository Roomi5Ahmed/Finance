import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Colors, BorderRadius } from '../../constants/theme'

export default function OnboardingStep2() {
  const [income, setIncome] = useState('')
  const [budget, setBudget] = useState('')
  const router = useRouter()
  const { session } = useAuth()

  const handleNext = async () => {
    if (session) {
      const updates: any = {}
      if (income) updates.monthly_income = parseFloat(income)
      if (budget) updates.monthly_budget = parseFloat(budget)
      if (Object.keys(updates).length > 0) {
        await supabase.from('user_profiles').upsert({ id: session.user.id, ...updates })
      }
    }
    router.push('/onboarding/step3')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: Colors.background, padding: 24, paddingTop: 60 }}
    >
      <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Step 2 of 3
      </Text>
      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.foreground, fontWeight: '700', marginBottom: 8 }}>
        Your monthly numbers
      </Text>
      <Text style={{ fontSize: 14, color: Colors.muted, marginBottom: 32 }}>
        This helps us calculate your budget ring. Both fields are optional.
      </Text>

      <View style={{ gap: 20 }}>
        <View>
          <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Monthly Income
          </Text>
          <TextInput
            value={income}
            onChangeText={setIncome}
            placeholder="e.g. 100000"
            placeholderTextColor={Colors.mutedDark}
            keyboardType="numeric"
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
            Monthly Budget
          </Text>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            placeholder="e.g. 50000"
            placeholderTextColor={Colors.mutedDark}
            keyboardType="numeric"
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
      </View>

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        onPress={handleNext}
        style={{
          backgroundColor: Colors.primary,
          borderRadius: BorderRadius.button,
          padding: 16,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#01472e', fontWeight: '600', fontSize: 15 }}>Continue</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/onboarding/step3')}
        style={{ padding: 16, alignItems: 'center' }}
      >
        <Text style={{ color: Colors.muted, fontSize: 14 }}>Skip for now</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}
