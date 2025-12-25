'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/notifications'

export interface Notification {
  id: string
  user_id: string
  type: 'clock-in' | 'clock-out' | 'ticket-assignment' | 'team-invite'
  title: string
  message: string
  data: {
    teamId: string
    teamName: string
    memberId: string
    memberName: string
    memberEmail?: string
    clockEventId?: string
    duration?: string
  }
  read: boolean
  created_at: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Fetch initial notifications
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) {
          console.error('Error fetching notifications:', error)
        } else {
          setNotifications(data || [])
          setUnreadCount(data?.filter((n) => !n.read).length || 0)
        }
      } catch (error) {
        console.error('Error in fetchNotifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [supabase])

  // Subscribe to realtime changes
  useEffect(() => {
    async function setupRealtimeSubscription() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel('notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newNotification = payload.new as Notification
              setNotifications((prev) => {
                // Check if notification already exists to prevent duplicates
                const exists = prev.some((n) => n.id === newNotification.id)
                if (exists) return prev
                return [newNotification, ...prev].slice(0, 20)
              })
              if (!newNotification.read) {
                setUnreadCount((prev) => prev + 1)
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedNotification = payload.new as Notification
              setNotifications((prev) => {
                const exists = prev.some((n) => n.id === updatedNotification.id)
                if (!exists) return prev
                return prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
              })
              // Recalculate unread count based on the change
              setNotifications((prev) => {
                const oldNotification = prev.find((n) => n.id === updatedNotification.id)
                if (oldNotification?.read === false && updatedNotification.read === true) {
                  setUnreadCount((count) => Math.max(0, count - 1))
                }
                return prev
              })
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as Notification).id
              setNotifications((prev) => {
                const deletedNotification = prev.find((n) => n.id === deletedId)
                if (deletedNotification && !deletedNotification.read) {
                  setUnreadCount((count) => Math.max(0, count - 1))
                }
                return prev.filter((n) => n.id !== deletedId)
              })
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    setupRealtimeSubscription()
  }, [supabase])

  // Mark a notification as read
  const markAsRead = async (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId)
    if (!notification || notification.read) return

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    const result = await markNotificationAsRead(notificationId)
    if (!result.success) {
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n))
      )
      setUnreadCount((prev) => prev + 1)
      console.error('Failed to mark notification as read:', result.error)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.read)
    if (unreadNotifications.length === 0) return

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)

    const result = await markAllNotificationsAsRead()
    if (!result.success) {
      // Revert on error - restore original read states
      setNotifications((prev) =>
        prev.map((n) => {
          const wasUnread = unreadNotifications.some((un) => un.id === n.id)
          return wasUnread ? { ...n, read: false } : n
        })
      )
      setUnreadCount(unreadNotifications.length)
      console.error('Failed to mark all notifications as read:', result.error)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  }
}
