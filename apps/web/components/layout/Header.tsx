'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Bell, Check } from 'lucide-react'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/lib/notifications'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  data: any
  read: boolean
  created_at: string
}

export default function Header() {
  const supabase = createClient()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadNotifications = async () => {
    const [notifs, count] = await Promise.all([getNotifications(15), getUnreadCount()])
    setNotifications(notifs)
    setUnreadCount(count)
  }

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkRead = async (id: string) => {
    await markAsRead(id)
    loadNotifications()
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    loadNotifications()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'budget_alert': return '💰'
      case 'bill_reminder': return '📋'
      case 'subscription_price_change': return '📈'
      case 'subscription_detected': return '🔄'
      default: return 'ℹ️'
    }
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <header style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '48px', paddingRight: '48px', position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Brand */}
      <span className="text-lg font-bold text-[#EFEFEF] tracking-wide shrink-0">
        Smart <span className="text-[#FF98A2]">Finance</span>
      </span>

      {/* Search & Actions */}
      <div className="flex items-center gap-5">
        <div className="hidden sm:block relative max-w-sm w-80">
          <Input
            type="text"
            placeholder="Search transactions..."
            className="bg-[#181818] border-white/5 h-9"
          />
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-[#8C8C8C] hover:text-[#EFEFEF] transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] relative p-1"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-[4px] bg-[#FF98A2] text-[#000000] text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#181818] border border-white/10 rounded-[11px] shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <h3 className="text-sm font-semibold text-[#EFEFEF]">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-[10px] text-[#FF98A2] hover:text-[#FF98A2]/80">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-[#8C8C8C] text-xs">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] ${!n.read ? 'bg-[#FF98A2]/5' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-sm shrink-0 mt-0.5">{getNotifIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-[#EFEFEF] truncate">{n.title}</p>
                            {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#FF98A2] shrink-0" />}
                          </div>
                          <p className="text-[10px] text-[#8C8C8C] mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[9px] text-[#8C8C8C]/50 mt-1">{formatTime(n.created_at)}</p>
                        </div>
                        {!n.read && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="text-[#8C8C8C] hover:text-[#FF98A2] shrink-0 mt-0.5 transition-colors duration-[0.6s]"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 bg-[#181818] px-3 py-1.5 rounded-[8px] border border-white/5">
          <div className="h-7 w-7 rounded-[6px] bg-[#FF98A2] flex items-center justify-center text-[#000000] text-[11px] font-bold">
            U
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs font-medium text-[#8C8C8C] hover:text-[#EFEFEF] transition-colors duration-[0.6s]"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
