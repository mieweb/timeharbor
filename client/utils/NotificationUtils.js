/**
 * Notification utility functions for managing push notifications
 */

// Check if running in Cordova
function isCordova() {
  return typeof window !== 'undefined' && 
         (window.cordova || window.PhoneGap || window.phonegap) &&
         typeof window.PushNotification !== 'undefined';
}

// Detect current platform (ios, android, or web)
function getPlatform() {
  if (isCordova() && window.cordova?.platformId) {
    return window.cordova.platformId.toLowerCase();
  }
  return 'web';
}

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
  // Check for Cordova first
  if (isCordova()) {
    return true;
  }
  // Fall back to Web Push API
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission() {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported');
  }

  // For Cordova, permission is handled by the plugin
  if (isCordova()) {
    return true;
  }

  // For Web Push
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
 * Subscribe to push notifications (Cordova or Web Push)
 */
export async function subscribeToPushNotifications() {
  try {
    // Check if notifications are supported
    if (!isPushNotificationSupported()) {
      throw new Error('Push notifications are not supported');
    }

    // Handle Cordova push notifications
    if (isCordova()) {
      return await subscribeToCordovaPush();
    }

    // Handle Web Push notifications
    return await subscribeToWebPush();
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}

/**
 * Subscribe to Cordova push notifications using FCM
 */
async function subscribeToCordovaPush() {
  return new Promise((resolve, reject) => {
    // Wait for device to be ready if not already
    const initPush = () => {
      // Get FCM Sender ID from server
      Meteor.call('getFcmSenderId', (err, senderId) => {
        if (err) {
          console.error('Error getting FCM Sender ID:', err);
          reject(err);
          return;
        }

        // Initialize push notification using havesource plugin
        const push = window.PushNotification.init({
          android: {
            senderID: senderId || '991518210130', // Fallback to default
            sound: true,
            vibrate: true,
            icon: 'notification_icon',
            iconColor: '#4285F4',
            forceShow: false // Don't show notifications when app is in foreground to prevent crashes
          },
          ios: {
            alert: true,
            badge: true,
            sound: true
          },
          windows: {}
        });

        // Register for push notifications
        push.on('registration', (data) => {
          console.log('Cordova push registration success:', data.registrationId);
          
          // Send FCM token to server
          Meteor.call('subscribeToPushNotifications', {
            type: 'fcm',
            token: data.registrationId,
            platform: getPlatform()
          }, (err, res) => {
            if (err) {
              console.error('Error sending FCM token to server:', err);
              reject(err);
            } else {
              // Store push instance for later use
              window._pushInstance = push;
              resolve(res);
            }
          });
        });

        push.on('notification', (data) => {
          console.log('Cordova push notification received:', data);
          
          try {
            // Check if app was opened from notification (background)
            const isBackground = data.additionalData?.foreground === false;
            
            if (isBackground && data.additionalData?.url) {
              // Only navigate if app was opened from notification (not when app is already open)
              // Use setTimeout to ensure navigation happens after app is fully ready
              setTimeout(() => {
                try {
                  if (window.Router && typeof window.Router.go === 'function') {
                    window.Router.go(data.additionalData.url);
                  }
                } catch (navError) {
                  console.error('Navigation error:', navError);
                }
              }, 100);
            }
            // When app is in foreground, notification is shown automatically by the plugin
            // No need to handle it further to prevent crashes
          } catch (error) {
            console.error('Error handling notification:', error);
            // Don't let notification handler crash the app
          }
        });

        push.on('error', (error) => {
          console.error('Cordova push error:', error);
          reject(error);
        });
      });
    };

    // Check if device is ready
    if (document.readyState === 'complete' || window.cordova) {
      // Wait a bit for cordova to be fully ready
      if (window.cordova && window.cordova.platformId) {
        initPush();
      } else {
        // Wait for deviceready event
        document.addEventListener('deviceready', initPush, false);
        // Fallback timeout
        setTimeout(() => {
          if (window.PushNotification) {
            initPush();
          } else {
            reject(new Error('PushNotification plugin not available'));
          }
        }, 2000);
      }
    } else {
      document.addEventListener('deviceready', initPush, false);
    }
  });
}

/**
 * Subscribe to Web Push notifications
 */
async function subscribeToWebPush() {
  // Request permission
  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) {
    throw new Error('Notification permission denied');
  }

  // Register service worker
  const registration = await registerServiceWorker();
  
  // Wait for service worker to be fully active
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
    Meteor.call('subscribeToPushNotifications', {
      type: 'webpush',
      ...subscription.toJSON()
    }, (err, res) => {
      if (err) {
        console.error('Error sending subscription to server:', err);
        reject(err);
      } else {
        resolve(res);
      }
    });
  });

  return result;
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications() {
  try {
    // Handle Cordova
    if (isCordova() && window._pushInstance) {
      window._pushInstance.unregister(() => {
        console.log('Cordova push unregistered');
      }, (error) => {
        console.error('Error unregistering Cordova push:', error);
      });
      window._pushInstance = null;
    } else if (!isCordova()) {
      // Handle Web Push
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }
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

  // Handle Cordova
  if (isCordova()) {
    return new Promise((resolve) => {
      // Check if we have a stored push instance
      if (window._pushInstance) {
        // Check server for subscription status
        Meteor.call('checkPushNotificationStatus', (err, result) => {
          if (err) {
            resolve({ supported: true, permission: 'unknown', subscribed: false });
          } else {
            resolve({
              supported: true,
              permission: 'granted', // Cordova handles permissions differently
              subscribed: result.enabled || false
            });
          }
        });
      } else {
        resolve({ supported: true, permission: 'unknown', subscribed: false });
      }
    });
  }

  // Handle Web Push
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

