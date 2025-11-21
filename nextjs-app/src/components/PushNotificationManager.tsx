'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushNotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      // Register service worker
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }).then(reg => {
        setRegistration(reg)
        reg.pushManager.getSubscription().then(sub => {
          if (sub) {
            setSubscription(sub)
            setIsSubscribed(true)
          }
          setIsLoading(false)
        })
      }).catch(err => {
        console.error('Service Worker registration failed:', err)
        setIsLoading(false)
      })
    } else {
      setIsSupported(false)
      setIsLoading(false)
    }
  }, [])

  const subscribeToPush = async () => {
    if (!registration) return
    setIsLoading(true)

    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      })
      
      setSubscription(sub)
      setIsSubscribed(true)

      // Save subscription to database
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ push_subscription: sub })
          .eq('id', user.id)
      }
      
      console.log('Web Push Subscribed!')
    } catch (error) {
      console.error('Failed to subscribe to Push', error)
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribeFromPush = async () => {
    if (!subscription) return
    setIsLoading(true)

    try {
      await subscription.unsubscribe()
      setSubscription(null)
      setIsSubscribed(false)

      // Remove subscription from database
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ push_subscription: null })
          .eq('id', user.id)
      }
      
      console.log('Web Push Unsubscribed!')
    } catch (error) {
      console.error('Failed to unsubscribe from Push', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-lg mb-6">
      <div className="card-body">
        <h3 className="card-title flex items-center gap-2">
          <span className="text-primary">🔔</span>
          Push Notifications
        </h3>
        
        {isSupported ? (
          <>
            {isSubscribed ? (
              <>
                <div className="alert alert-success">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>Notifications are enabled! You'll receive alerts when team members clock in/out.</span>
                </div>
                <button 
                  onClick={unsubscribeFromPush} 
                  className="btn btn-outline btn-error mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? <span className="loading loading-spinner"></span> : '🔕 Disable Notifications'}
                </button>
              </>
            ) : (
              <>
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>Enable push notifications to get notified when your team members clock in or clock out.</span>
                </div>
                <button 
                  onClick={subscribeToPush} 
                  className="btn btn-primary mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? <span className="loading loading-spinner"></span> : '🔔 Enable Notifications'}
                </button>
              </>
            )}
          </>
        ) : (
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>Push notifications are not supported in your browser. Try using Chrome, Firefox, or Edge.</span>
          </div>
        )}
      </div>
    </div>
  )
}

