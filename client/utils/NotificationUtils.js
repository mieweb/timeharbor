/**
* Notification utility functions for managing push notifications
*/
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';


// Check if running in Cordova
function isCordova() {
  return typeof window !== 'undefined' &&
    (window.cordova || window.PhoneGap || window.phonegap);
}


// Detect current platform (ios, android, or web)
function getPlatform() {
  if (isCordova() && window.cordova?.platformId) {
    return window.cordova.platformId.toLowerCase();
  }
  return 'web';
}


// Robust onDeviceReady helper
function onDeviceReady() {
  return new Promise((resolve) => {
    if (typeof cordova === 'undefined' || !isCordova()) {
      resolve();
      return;
    }


    if (window.cordova && window.cordova.plugins) {
      resolve();
    } else {
      document.addEventListener('deviceready', () => {
        resolve();
      }, { once: true });
    }
  });
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
  // Check for Cordova
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
* Initialize notifications on app startup
*/
let isInitialized = false;

export async function initializeNotifications() {
  if (isCordova()) {
    await onDeviceReady();

    const mess = window.cordova?.plugins?.firebase?.messaging;
    if (!mess) return;

    // Setup background notification click handler
    mess.onBackgroundMessage((payload) => {
      console.log('[Push] Background message:', payload);
    });

    // Setup foreground notification handler
    mess.onMessage((payload) => {
      console.log('[Push] Foreground message:', payload);
      const title = payload.notification?.title || payload.title || 'Notification';
      const body = payload.notification?.body || payload.body || '';
      if (title || body) {
        alert(`${title}: ${body}`);
      }
    });

    // Silent Token Refresh: Always ensure server has latest token at least once per session
    Tracker.autorun(async () => {
      const user = Meteor.user();
      const isLoggingIn = Meteor.loggingIn();

      // If user logs out, reset initialization flag so it can re-run on next login
      if (!user && !isLoggingIn) {
        isInitialized = false;
        return;
      }

      if (user && !isLoggingIn && !isInitialized) {
        if (user.profile?.pushSubscription && user.profile.pushSubscription.type === 'fcm') {
          isInitialized = true; // Only do this once per login session

          try {
            // Re-request permission silently
            await mess.requestPermission({ forceShow: false });

            const token = await mess.getToken();

            // Sync with server to ensure persistence
            Meteor.call('subscribeToPushNotifications', {
              type: 'fcm',
              token: token,
              platform: getPlatform()
            }, (err) => {
              if (err) console.error('[Push] Sync failed:', err);
              else console.log('[Push] Registration synced successfully');
            });
          } catch (err) {
            console.error('[Push] Init failed:', err);
          }
        }
      }
    });
  }
}


/**
* Subscribe to Cordova push notifications using Firebase Messaging
*/
async function subscribeToCordovaPush() {
  try {
    await onDeviceReady();


    // Check if plugin exists
    if (!window.cordova?.plugins?.firebase?.messaging) {
      console.error('Firebase Messaging plugin not installed!');
      throw new Error('Push notification service not available. Please rebuild the app.');
    }


    const mess = window.cordova.plugins.firebase.messaging;


    // Request permission (iOS specifically needs this)
    console.log('Requesting push permission...');
    await mess.requestPermission({ forceShow: true });
    console.log('Push permission granted or already exists');


    // Get FCM Token
    const token = await mess.getToken();
    if (!token) {
      throw new Error('Failed to obtain push token');
    }


    console.log('FCM Token received:', token);


    // Subscribe to server
    return await new Promise((resolve, reject) => {
      Meteor.call('subscribeToPushNotifications', {
        type: 'fcm',
        token: token,
        platform: getPlatform()
      }, (err, res) => {
        if (err) {
          console.error('Error sending FCM token to server:', err);
          reject(err);
        } else {
          console.log('Successfully subscribed to push notifications on server');
          resolve(res);
        }
      });
    });
  } catch (error) {
    console.error('Exception in subscribeToCordovaPush:', error);
    throw error;
  }
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
    if (isCordova()) {
      await onDeviceReady();
      const mess = window.cordova?.plugins?.firebase?.messaging;
      if (mess) {
        try {
          await mess.deleteToken();
          console.log('Cordova FCM token deleted');
        } catch (tokenErr) {
          console.warn('Failed to delete FCM token locally, proceeding with server unsubscription:', tokenErr);
        }
      }
    } else {
      // Handle Web Push
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();


        if (subscription) {
          await subscription.unsubscribe();
        }
      } catch (webErr) {
        console.warn('Failed to unsubscribe from web push locally:', webErr);
      }
    }


    // Update server - ALWAYS do this even if local unsubscription failed
    await new Promise((resolve, reject) => {
      Meteor.call('unsubscribeFromPushNotifications', (err, res) => {
        if (err) {
          console.error('Server unsubscription failed:', err);
          reject(err);
        } else {
          resolve(res);
        }
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
      // Check server for subscription status as primary source of truth for "subscribed" state
      // because we don't store local state and token existence doesn't guarantee server subscription
      Meteor.call('checkPushNotificationStatus', (err, result) => {
        if (err) {
          resolve({ supported: true, permission: 'unknown', subscribed: false });
        } else {
          resolve({
            supported: true,
            permission: 'granted', // If we are here, we assume granted or will prompt.
            subscribed: result.enabled || false
          });
        }
      });
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
