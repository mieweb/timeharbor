/**
 * Mobile (Cordova) push notification utilities using cordova-plugin-push
 */

let pushInstance = null;

/**
 * Check if running in Cordova
 */
export function isCordova() {
  return typeof window !== 'undefined' && 
         (window.cordova || window.PhoneGap || window.phonegap ||
          (typeof device !== 'undefined' && device.platform));
}

/**
 * Initialize push notifications for mobile
 */
export function initMobilePushNotifications() {
  return new Promise((resolve, reject) => {
    if (!isCordova()) {
      reject(new Error('Not running in Cordova'));
      return;
    }

    // Wait for device ready
    if (typeof device === 'undefined') {
      document.addEventListener('deviceready', () => {
        initializePush();
      }, false);
    } else {
      initializePush();
    }

    function initializePush() {
      try {
        const Push = window.PushNotification;
        if (!Push) {
          reject(new Error('PushNotification plugin not available'));
          return;
        }

        pushInstance = Push.init({
          android: {
            senderID: '991518210130', // FCM Sender ID from settings.json
            sound: true,
            vibrate: true,
            clearNotifications: true
          },
          ios: {
            alert: true,
            badge: true,
            sound: true
          }
        });

        // Handle registration
        pushInstance.on('registration', (data) => {
          console.log('Mobile push registration successful:', data.registrationId);
          resolve({
            type: 'fcm',
            registrationId: data.registrationId,
            registrationType: data.registrationType
          });
        });

        // Handle errors
        pushInstance.on('error', (error) => {
          console.error('Mobile push error:', error);
          reject(error);
        });

        // Handle incoming notifications
        pushInstance.on('notification', (data) => {
          console.log('Mobile notification received:', data);
          
          // Handle notification click
          if (data.additionalData && data.additionalData.foreground === false) {
            // App was opened from notification
            if (data.additionalData.url) {
              // Navigate to URL if provided
              console.log('Navigate to:', data.additionalData.url);
            }
          }
        });

      } catch (error) {
        reject(error);
      }
    }
  });
}

/**
 * Subscribe to mobile push notifications
 */
export async function subscribeToMobilePushNotifications() {
  if (!isCordova()) {
    throw new Error('Not running in Cordova');
  }

  try {
    const registrationData = await initMobilePushNotifications();
    
    // Send registration to server using the same method as web
    const result = await new Promise((resolve, reject) => {
      Meteor.call('subscribeToPushNotifications', registrationData, (err, res) => {
        if (err) {
          console.error('Error sending mobile subscription to server:', err);
          reject(err);
        } else {
          resolve(res);
        }
      });
    });

    return result;
  } catch (error) {
    console.error('Error subscribing to mobile push notifications:', error);
    throw error;
  }
}

/**
 * Unsubscribe from mobile push notifications
 */
export async function unsubscribeFromMobilePushNotifications() {
  if (!isCordova() || !pushInstance) {
    return { success: true };
  }

  try {
    // Unregister from push service
    pushInstance.unregister(
      () => {
        console.log('Mobile push unregistered successfully');
      },
      (error) => {
        console.error('Error unregistering mobile push:', error);
      }
    );

    // Update server
    await new Promise((resolve, reject) => {
      Meteor.call('unsubscribeFromPushNotifications', (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    pushInstance = null;
    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing from mobile push notifications:', error);
    throw error;
  }
}

/**
 * Check mobile push notification status
 */
export async function checkMobileNotificationStatus() {
  if (!isCordova()) {
    return { supported: false, subscribed: false };
  }

  try {
    // Check if user has a mobile subscription stored
    const status = await new Promise((resolve, reject) => {
      Meteor.call('checkPushNotificationStatus', (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    return {
      supported: true,
      subscribed: status.enabled || false
    };
  } catch (error) {
    return {
      supported: true,
      subscribed: false
    };
  }
}

