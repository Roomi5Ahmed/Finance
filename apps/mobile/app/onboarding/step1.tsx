import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Colors, BorderRadius } from '../../constants/theme'

const CURRENCIES = [
  { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound' },
]

export default function OnboardingStep1() {
  const [selected, setSelected] = useState('INR')
  const router = useRouter()
  const { session } = useAuth()

  const handleNext = async () => {
    if (session) {
      await supabase.from('user_profiles').upsert({
        id: session.user.id,
        currency: selected,
      })
    }
    router.push('/onboarding/step2')
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, padding: 24, paddingTop: 60 }}>
      <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Step 1 of 3
      </Text>
      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.foreground, fontWeight: '700', marginBottom: 8 }}>
        Choose your currency
      </Text>
      <Text style={{ fontSize: 14, color: Colors.muted, marginBottom: 32 }}>
        We&apos;ll use this to display all amounts.
      </Text>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ gap: 12 }}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              onPress={() => setSelected(c.code)}
              style={{
                backgroundColor: selected === c.code ? 'rgba(204,213,174,0.1)' : Colors.surface,
                borderWidth: 1,
                borderColor: selected === c.code ? Colors.primary : Colors.borderLight,
                borderRadius: BorderRadius.input,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 24, marginRight: 16 }}>{c.symbol}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.foreground, fontSize: 16, fontWeight: '600' }}>{c.name}</Text>
                <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 2 }}>{c.code}</Text>
              </View>
              {selected === c.code && (
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#01472e', fontSize: 12, fontWeight: '700' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={handleNext}
        style={{
          backgroundColor: Colors.primary,
          borderRadius: BorderRadius.button,
          padding: 16,
          alignItems: 'center',
          marginTop: 24,
        }}
      >
        <Text style={{ color: '#01472e', fontWeight: '600', fontSize: 15 }}>Continue</Text>
      </TouchableOpacity>
    </View>
  )
}
