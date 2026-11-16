import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { api } from '../../lib/api'
import { Colors, BorderRadius } from '../../constants/theme'

const TYPE_ICONS: Record<string, string> = {
  budget: '🎯',
  subscription: '🔄',
  bill: '📅',
  default: '🔔',
}

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [busy, setBusy] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getNotifications(50)
      setNotifications(result.notifications || [])
      setUnreadCount(result.unreadCount || 0)
    } catch (e) {
      console.warn('Failed to load notifications:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  const handleMarkAllRead = async () => {
    setBusy(true)
    try {
      await api.markAllNotificationsRead()
      await fetchData()
    } catch (e: any) {
      console.warn(e)
    } finally {
      setBusy(false)
    }
  }

  const handleMarkRead = async (id: string, read: boolean) => {
    if (read) return
    try {
      await api.markNotificationRead(id)
      await fetchData()
    } catch (e) {
      console.warn(e)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.foreground, fontWeight: '700' }}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Text style={{ fontSize: 12, color: Colors.primary, marginTop: 2 }}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} disabled={busy}
            style={{ backgroundColor: 'rgba(204,213,174,0.1)', borderRadius: BorderRadius.button, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(204,213,174,0.3)', opacity: busy ? 0.5 : 1 }}>
            <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleMarkRead(item.id, item.read)}
            style={{
              backgroundColor: item.read ? Colors.surface : Colors.surfaceLight,
              padding: 14, marginBottom: 8, borderWidth: 1,
              borderColor: item.read ? Colors.border : 'rgba(204,213,174,0.2)',
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
            }}>
            <Text style={{ fontSize: 20, marginTop: 2 }}>
              {TYPE_ICONS[item.type] || TYPE_ICONS.default}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.foreground, fontSize: 14, fontWeight: item.read ? '400' : '600' }}>
                {item.title}
              </Text>
              {item.body && (
                <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                  {item.body}
                </Text>
              )}
              <Text style={{ color: Colors.mutedDark, fontSize: 11, marginTop: 6 }}>
                {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {!item.read && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 }} />
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
            <Text style={{ color: Colors.muted, fontSize: 14, textAlign: 'center' }}>
              No notifications yet.{'\n'}Budget alerts, bill reminders, and subscription changes will appear here.
            </Text>
          </View>
        }
      />
    </View>
  )
}
