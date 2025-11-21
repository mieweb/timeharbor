'use server'

import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

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
