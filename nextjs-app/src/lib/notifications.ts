'use server'

import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

interface NotificationData {
  teamId: string
  teamName: string
  memberId: string
  memberName: string
  memberEmail?: string
  clockEventId?: string
  duration?: string
}

interface CreateNotificationParams {
  type: 'clock-in' | 'clock-out' | 'ticket-assignment' | 'team-invite'
  title: string
  message: string
  data: NotificationData
}

export async function sendNotification(userId: string, payload: { title: string, body: string, url?: string }) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey || publicKey.startsWith('your_') || privateKey.startsWith('your_')) {
    console.warn('VAPID keys are not set or are invalid. Skipping push notification.')
    return
  }

  try {
    webpush.setVapidDetails(
      'mailto:admin@timeharbor.com',
      publicKey,
      privateKey
    )
  } catch (error) {
    console.error('Failed to set VAPID details:', error)
    return
  }

  const supabase = await createClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('push_subscription')
    .eq('id', userId)
    .single()

  if (!profile?.push_subscription) return

  try {
    await webpush.sendNotification(
      profile.push_subscription as any,
      JSON.stringify(payload)
    )
  } catch (error) {
    console.error('Error sending push notification:', error)
  }
}

/**
 * Notify all team leaders/admins when a team member performs an action
 */
export async function notifyTeamLeaders(
  teamId: string,
  notification: CreateNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Get the team name
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single()

    if (!team) {
      return { success: false, error: 'Team not found' }
    }

    // Get all leaders/admins of the team
    const { data: leaders, error: leadersError } = await supabase
      .from('team_members')
      .select('user_id, profiles(id, full_name)')
      .eq('team_id', teamId)
      .in('role', ['admin', 'leader'])

    if (leadersError) {
      console.error('Error fetching team leaders:', leadersError)
      return { success: false, error: leadersError.message }
    }

    if (!leaders || leaders.length === 0) {
      // No leaders to notify, but not an error
      return { success: true }
    }

    // Create notification for each leader
    const notifications = leaders.map((leader) => ({
      user_id: leader.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: {
        ...notification.data,
        teamName: team.name,
      },
      read: false,
    }))

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (insertError) {
      console.error('Error creating notifications:', insertError)
      return { success: false, error: insertError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in notifyTeamLeaders:', error)
    return { success: false, error: 'Failed to create notifications' }
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error)
    return { success: false, error: 'Failed to mark notification as read' }
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error)
    return { success: false, error: 'Failed to mark all notifications as read' }
  }
}

/**
 * Get notifications for the current user
 */
export async function getNotifications(limit: number = 20): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching notifications:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getNotifications:', error)
    return { success: false, error: 'Failed to fetch notifications' }
  }
}
