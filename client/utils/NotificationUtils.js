/**
 * Notification utility functions for managing push notifications
 */

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission() {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Register service worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported');
  }

  try {
    // Unregister any existing service workers first
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of existingRegistrations) {
      await registration.unregister();
    }
    
    // Register new service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications() {
  try {
    // Check if notifications are supported
    if (!isPushNotificationSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }

    // Request permission
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      throw new Error('Notification permission denied');
    }

    // Register service worker
    const registration = await registerServiceWorker();
    
    // Wait a bit for service worker to be fully active
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get VAPID public key from server
    const vapidPublicKey = await new Promise((resolve, reject) => {
      Meteor.call('getVapidPublicKey', (err, key) => {
        if (err) {
          console.error('Error getting VAPID key:', err);
          reject(err);
        } else {
          resolve(key);
        }
      });
    });

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Subscribe to push notifications
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    // Send subscription to server
    const result = await new Promise((resolve, reject) => {
      Meteor.call('subscribeToPushNotifications', subscription.toJSON(), (err, res) => {
        if (err) {
          console.error('Error sending subscription to server:', err);
          reject(err);
        } else {
          resolve(res);
        }
      });
    });

    return result;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Update server
    await new Promise((resolve, reject) => {
      Meteor.call('unsubscribeFromPushNotifications', (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
}

/**
 * Check current subscription status
 */
export async function checkNotificationStatus() {
  if (!isPushNotificationSupported()) {
    return { supported: false, permission: 'denied', subscribed: false };
  }

  const permission = Notification.permission;
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    let subscribed = false;
    
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      subscribed = !!subscription;
    }

    return {
      supported: true,
      permission,
      subscribed
    };
  } catch (error) {
    return {
      supported: true,
      permission,
      subscribed: false
    };
  }
}

