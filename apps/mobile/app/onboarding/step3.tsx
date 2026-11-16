import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Colors, BorderRadius } from '../../constants/theme'

const GOALS = [
  { id: 'save_money', icon: '💰', label: 'Save money' },
  { id: 'reduce_subscriptions', icon: '📉', label: 'Reduce subscriptions' },
  { id: 'track_spending', icon: '📊', label: 'Track spending' },
  { id: 'debt_paydown', icon: '🏦', label: 'Debt paydown' },
]

export default function OnboardingStep3() {
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const { session } = useAuth()

  const handleFinish = async () => {
    if (!selected) {
      Alert.alert('Please select a goal', 'Pick one to continue, or skip.')
      return
    }
    setSaving(true)
    if (session) {
      await supabase.from('user_profiles').upsert({
        id: session.user.id,
        financial_goal: selected,
      })
    }
    setSaving(false)
    router.replace('/(tabs)')
  }

  const handleSkip = () => {
    router.replace('/(tabs)')
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, padding: 24, paddingTop: 60 }}>
      <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Step 3 of 3
      </Text>
      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.foreground, fontWeight: '700', marginBottom: 8 }}>
        What&apos;s your goal?
      </Text>
      <Text style={{ fontSize: 14, color: Colors.muted, marginBottom: 32 }}>
        We&apos;ll tailor insights to help you reach it.
      </Text>

      <View style={{ gap: 12 }}>
        {GOALS.map((g) => (
          <TouchableOpacity
            key={g.id}
            onPress={() => setSelected(g.id)}
            style={{
              backgroundColor: selected === g.id ? 'rgba(204,213,174,0.1)' : Colors.surface,
              borderWidth: 1,
              borderColor: selected === g.id ? Colors.primary : Colors.borderLight,
              borderRadius: BorderRadius.input,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 24, marginRight: 16 }}>{g.icon}</Text>
            <Text style={{ color: Colors.foreground, fontSize: 16, fontWeight: '600', flex: 1 }}>{g.label}</Text>
            {selected === g.id && (
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#01472e', fontSize: 12, fontWeight: '700' }}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        onPress={handleFinish}
        disabled={saving}
        style={{
          backgroundColor: Colors.primary,
          borderRadius: BorderRadius.button,
          padding: 16,
          alignItems: 'center',
          opacity: saving ? 0.5 : 1,
        }}
      >
        <Text style={{ color: '#01472e', fontWeight: '600', fontSize: 15 }}>
          {saving ? 'Saving...' : 'Get Started'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSkip} style={{ padding: 16, alignItems: 'center' }}>
        <Text style={{ color: Colors.muted, fontSize: 14 }}>Skip</Text>
      </TouchableOpacity>
    </View>
  )
}
