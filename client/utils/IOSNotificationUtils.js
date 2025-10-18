// iOS Push Notification utilities for Time Harbor client
import { Meteor } from 'meteor/meteor';
import { Push } from 'meteor/activitree:push';

/**
 * Check if iOS push notifications are supported
 */
export function isIOSPushNotificationSupported() {
  return typeof Push !== 'undefined' && Push.isSupported();
}

/**
 * Request iOS push notification permission
 */
export async function requestIOSNotificationPermission() {
  try {
    if (!isIOSPushNotificationSupported()) {
      throw new Error('iOS push notifications are not supported');
    }

    // Request permission
    const permission = await Push.requestPermission();
    
    if (permission === 'granted') {
      return true;
    } else {
      throw new Error('Notification permission denied');
    }
  } catch (error) {
    console.error('Error requesting iOS notification permission:', error);
    throw error;
  }
}

/**
 * Register for iOS push notifications
 */
export async function registerForIOSPushNotifications() {
  try {
    // Check if notifications are supported
    if (!isIOSPushNotificationSupported()) {
      throw new Error('iOS push notifications are not supported');
    }

    // Request permission
    const permissionGranted = await requestIOSNotificationPermission();
    if (!permissionGranted) {
      throw new Error('Notification permission denied');
    }

    // Get push token
    const token = await Push.getToken();
    
    if (!token) {
      throw new Error('Failed to get push token');
    }

    // Send token to server
    const result = await new Promise((resolve, reject) => {
      Meteor.call('registerIOSPushToken', token, (err, res) => {
        if (err) {
          console.error('Error registering iOS push token:', err);
          reject(err);
        } else {
          resolve(res);
        }
      });
    });

    return result;
  } catch (error) {
    console.error('Error registering for iOS push notifications:', error);
    throw error;
  }
}

/**
 * Unregister from iOS push notifications
 */
export async function unregisterFromIOSPushNotifications() {
  try {
    // Unregister from server
    const result = await new Promise((resolve, reject) => {
      Meteor.call('unregisterIOSPushToken', (err, res) => {
        if (err) {
          console.error('Error unregistering iOS push token:', err);
          reject(err);
        } else {
          resolve(res);
        }
      });
    });

    return result;
  } catch (error) {
    console.error('Error unregistering from iOS push notifications:', error);
    throw error;
  }
}

/**
 * Check iOS push notification status
 */
export function checkIOSPushNotificationStatus() {
  return new Promise((resolve, reject) => {
    Meteor.call('checkIOSPushNotificationStatus', (err, result) => {
      if (err) {
        console.error('Error checking iOS push notification status:', err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Send test notification
 */
export function sendTestIOSNotification(message) {
  return new Promise((resolve, reject) => {
    Meteor.call('sendTestIOSNotification', message, (err, result) => {
      if (err) {
        console.error('Error sending test iOS notification:', err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Handle push notification events
 */
export function setupIOSPushNotificationHandlers() {
  if (!isIOSPushNotificationSupported()) {
    return;
  }

  // Handle notification received
  Push.on('notification', (notification) => {
    console.log('iOS notification received:', notification);
    
    // Handle different notification types
    if (notification.payload) {
      const { type, teamId, userId } = notification.payload;
      
      switch (type) {
        case 'clock-in':
        case 'clock-out':
          // Navigate to team page or show team info
          console.log(`Team activity: ${type} for team ${teamId}`);
          break;
        case 'test':
          console.log('Test notification received');
          break;
        default:
          console.log('Unknown notification type:', type);
      }
    }
  });

  // Handle notification click
  Push.on('click', (notification) => {
    console.log('iOS notification clicked:', notification);
    
    if (notification.payload) {
      const { type, teamId, userId } = notification.payload;
      
      // Navigate to relevant page based on notification type
      if (teamId) {
        // Navigate to team page
        console.log(`Navigating to team ${teamId}`);
        // You can implement navigation logic here
      }
    }
  });
}

/**
 * Initialize iOS push notifications
 */
export async function initializeIOSPushNotifications() {
  try {
    // Setup event handlers
    setupIOSPushNotificationHandlers();
    
    // Check current status
    const status = await checkIOSPushNotificationStatus();
    
    if (!status.enabled) {
      console.log('iOS push notifications not enabled, user can enable in settings');
    } else {
      console.log('iOS push notifications are enabled');
    }
    
    return status;
  } catch (error) {
    console.error('Error initializing iOS push notifications:', error);
    throw error;
  }
}
