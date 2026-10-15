import 'react-native-url-polyfill/auto'
import { Platform } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const memoryStorage = {
  getItem: async (_key: string): Promise<string | null> => null,
  setItem: async (_key: string, _value: string): Promise<void> => {},
  removeItem: async (_key: string): Promise<void> => {},
}

const storage =
  Platform.OS !== 'web'
    ? {
        getItem: (key: string) =>
          require('expo-secure-store').getItemAsync(key),
        setItem: (key: string, value: string) =>
          require('expo-secure-store').setItemAsync(key, value),
        removeItem: (key: string) =>
          require('expo-secure-store').deleteItemAsync(key),
      }
    : typeof window !== 'undefined'
      ? AsyncStorage
      : memoryStorage

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
