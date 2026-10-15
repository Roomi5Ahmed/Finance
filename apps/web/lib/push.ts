import type { SupabaseClient } from '@supabase/supabase-js'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export interface PushMessage {
  title: string
  body: string
  data?: Record<string, any>
}

export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  message: PushMessage
) {
  try {
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('expo_push_token')
      .eq('user_id', userId)

    if (!tokens || tokens.length === 0) return

    const messages = tokens
      .filter(t => t.expo_push_token)
      .map(t => ({
        to: t.expo_push_token,
        title: message.title,
        body: message.body,
        data: message.data || {},
        sound: 'default',
      }))

    if (messages.length === 0) return

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.EXPO_ACCESS_TOKEN
          ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(messages),
    })

    if (!res.ok) {
      console.error('Expo push API error:', res.status, await res.text())
    }
  } catch (err) {
    console.error('Failed to send push notification:', err)
  }
}

export async function registerDeviceToken(
  supabase: SupabaseClient,
  userId: string,
  expoPushToken: string,
  platform: 'ios' | 'android'
) {
  const { error } = await supabase
    .from('device_tokens')
    .upsert(
      { user_id: userId, expo_push_token: expoPushToken, platform },
      { onConflict: 'user_id, expo_push_token' }
    )

  if (error) {
    console.error('Failed to register device token:', error)
    return false
  }
  return true
}
