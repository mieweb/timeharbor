/**
 * Mobile Push Notifications for Cordova
 * Works for both Android and iOS
 */

let pushNotification = null;
let isDeviceReady = false;

// Wait for device to be ready
document.addEventListener('deviceready', function() {
  isDeviceReady = true;
  initializePushNotifications();
}, false);

// Also check if already ready (for hot reload or if deviceready already fired)
if (typeof cordova !== 'undefined' && cordova.platformId) {
  isDeviceReady = true;
  initializePushNotifications();
} else if (typeof cordova !== 'undefined') {
  // Wait a bit for deviceready if not fired yet
  setTimeout(function() {
    if (typeof cordova !== 'undefined' && typeof PushNotification !== 'undefined') {
      isDeviceReady = true;
      initializePushNotifications();
    }
  }, 1000);
}

/**
 * Initialize push notifications
 */
function initializePushNotifications() {
  if (!isDeviceReady || typeof PushNotification === 'undefined') {
    return;
  }

  try {
    // Get FCM Sender ID from Meteor settings
    const senderId = Meteor.settings?.public?.fcmSenderId || '991518210130';

    // Initialize push notification plugin
    pushNotification = PushNotification.init({
      android: {
        senderID: senderId
      },
      ios: {
        alert: true,
        badge: true,
        sound: true
      },
      windows: {}
    });

    // Check if already registered (in case registration happened before listener was attached)
    setTimeout(function() {
      if (pushNotification && typeof pushNotification.getRegistrationId === 'function') {
        pushNotification.getRegistrationId(function(registrationId) {
          if (registrationId) {
            let platform = 'android';
            if (typeof device !== 'undefined' && device.platform) {
              platform = device.platform.toLowerCase();
            } else if (typeof cordova !== 'undefined' && cordova.platformId) {
              platform = cordova.platformId.toLowerCase();
            }
            Meteor.call('registerMobileDeviceToken', registrationId, platform);
          }
        });
      }
    }, 2000);

    // Handle successful registration
    if (typeof pushNotification.on === 'function') {
      pushNotification.on('registration', function(data) {
        let platform = 'android';
        if (typeof device !== 'undefined' && device.platform) {
          platform = device.platform.toLowerCase();
        } else if (typeof cordova !== 'undefined' && cordova.platformId) {
          platform = cordova.platformId.toLowerCase();
        }
        
        Meteor.call('registerMobileDeviceToken', data.registrationId, platform, function(error) {
          if (error) {
            console.error('Failed to register device token:', error);
          }
        });
      });
    }

    // Handle registration errors
    if (typeof pushNotification.on === 'function') {
      pushNotification.on('error', function(error) {
        console.error('Push notification error:', error.message || error);
      });
    }

    // Handle incoming notifications
    if (typeof pushNotification.on === 'function') {
      pushNotification.on('notification', function(data) {
        // Check if this is actually a registration event
        if (data.registrationId) {
          let platform = 'android';
          if (typeof device !== 'undefined' && device.platform) {
            platform = device.platform.toLowerCase();
          } else if (typeof cordova !== 'undefined' && cordova.platformId) {
            platform = cordova.platformId.toLowerCase();
          }
          
          Meteor.call('registerMobileDeviceToken', data.registrationId, platform, function(error) {
            if (error) {
              console.error('Failed to register device token:', error);
            }
          });
          return;
        }

        // Handle notification data
        if (data.additionalData) {
          handleNotificationData(data.additionalData);
        }

        // Show in-app alert if app is in foreground
        if (data.additionalData && data.additionalData.foreground) {
          if (typeof navigator !== 'undefined' && navigator.notification) {
            navigator.notification.alert(
              data.message || data.title,
              function() {},
              data.title || 'Time Harbor',
              'OK'
            );
          }
        }
      });
    }

  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    pushNotification = null;
  }
}

/**
 * Handle notification data
 */
function handleNotificationData(data) {
  // Navigate based on notification type
  if (data.url) {
    // Use FlowRouter to navigate
    if (typeof FlowRouter !== 'undefined') {
      FlowRouter.go(data.url);
    }
  }

  // Handle different notification types
  switch (data.type) {
    case 'clock-in':
    case 'clock-out':
      // Refresh clock events or navigate to tickets
      if (typeof FlowRouter !== 'undefined') {
        FlowRouter.go('/tickets');
      }
      break;
    case 'auto-clock-out':
      // Navigate to timesheet
      if (typeof FlowRouter !== 'undefined' && data.userId) {
        FlowRouter.go('/timesheet/' + data.userId);
      }
      break;
    default:
      // Default action
      break;
  }
}

/**
 * Check if push notifications are available
 */
export function isMobilePushAvailable() {
  return isDeviceReady && typeof PushNotification !== 'undefined';
}

/**
 * Get current registration status
 */
export function getPushRegistrationStatus() {
  return new Promise((resolve) => {
    const isCordova = typeof cordova !== 'undefined';
    const hasPushPlugin = typeof PushNotification !== 'undefined';
    
    if (!isCordova || !hasPushPlugin) {
      resolve({ available: false, registered: false });
      return;
    }

    if (pushNotification) {
      if (typeof pushNotification.getRegistrationId === 'function') {
        pushNotification.getRegistrationId(function(registrationId) {
          resolve({
            available: true,
            registered: !!registrationId && registrationId.length > 0
          });
        }, function() {
          resolve({
            available: true,
            registered: false
          });
        });
      } else {
        resolve({
          available: true,
          registered: false
        });
      }
    } else {
      resolve({ available: true, registered: false });
    }
  });
}

/**
 * Unregister from push notifications
 */
export function unregisterMobilePush() {
  return new Promise((resolve, reject) => {
    if (!isMobilePushAvailable() || !pushNotification) {
      reject(new Error('Push notifications not available'));
      return;
    }

    // Get the current token before unregistering
    pushNotification.getRegistrationId(function(registrationId) {
      const deviceToken = registrationId;
      
      // Unregister from device
      pushNotification.unregister(function() {
        // Remove token from server
        if (deviceToken) {
          Meteor.call('unregisterMobileDeviceToken', deviceToken, function(error) {
            if (error) {
              console.error('Failed to unregister token from server:', error);
            }
          });
        }
        resolve({ success: true });
      }, function(error) {
        reject(error);
      });
    }, function(error) {
      // If we can't get registration ID, just unregister
      pushNotification.unregister(function() {
        resolve({ success: true });
      }, function(err) {
        reject(err);
      });
    });
  });
}

// Export for use in other files
export { pushNotification };

