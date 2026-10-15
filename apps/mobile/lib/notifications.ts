import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { api } from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF98A2',
    })
  }

  const token = await Notifications.getExpoPushTokenAsync()
  return token.data
}

export async function registerDeviceWithBackend(): Promise<string | null> {
  try {
    const token = await registerForPushNotifications()
    if (!token) return null
    await api.registerDevice(token, Platform.OS === 'ios' ? 'ios' : 'android')
    return token
  } catch (e) {
    console.warn('Device registration failed:', e)
    return null
  }
}
