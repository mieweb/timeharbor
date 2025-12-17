import webpush from 'web-push';
import { Meteor } from 'meteor/meteor';
import { Teams } from '../../collections.js';

// VAPID keys for Web Push
// These are loaded from Meteor.settings (settings.json)
const vapidKeys = {
  publicKey: Meteor.settings.private?.VAPID_PUBLIC_KEY || Meteor.settings.public?.vapidPublicKey,
  privateKey: Meteor.settings.private?.VAPID_PRIVATE_KEY
};

// Configure web-push
webpush.setVapidDetails(
  'mailto:admin@timeharbor.com', // Your email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Initialize Firebase Admin SDK for FCM (lazy load)
let admin = null;
let messaging = null;

function getFirebaseAdmin() {
  if (!admin) {
    try {
      admin = require('firebase-admin');
      
      // Check if already initialized
      if (admin.apps.length === 0) {
        const serviceAccount = {
          projectId: Meteor.settings.private?.FCM_PROJECT_ID,
          privateKey: Meteor.settings.private?.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: Meteor.settings.private?.FCM_CLIENT_EMAIL
        };

        if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          messaging = admin.messaging();
        } else {
          console.warn('FCM credentials not found in settings. FCM notifications will not work.');
        }
      } else {
        messaging = admin.messaging();
      }
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      console.warn('FCM notifications will not be available. Install firebase-admin package: npm install firebase-admin');
    }
  }
  return { admin, messaging };
}

/**
 * Send a push notification to a specific subscription (supports Web Push and FCM)
 * @param {Object} subscription - The push subscription object (can be Web Push or FCM token)
 * @param {Object} payload - The notification payload
 */
export async function sendPushNotification(subscription, payload) {
  try {
    // Check subscription type
    const subscriptionType = subscription.type || 'webpush';
    
    if (subscriptionType === 'fcm') {
      return await sendFcmNotification(subscription.token, payload);
    } else {
      return await sendWebPushNotification(subscription, payload);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send FCM notification
 * @param {String} token - FCM registration token
 * @param {Object} payload - The notification payload
 */
async function sendFcmNotification(token, payload) {
  const { messaging } = getFirebaseAdmin();
  
  if (!messaging) {
    return { success: false, error: 'FCM not initialized. Check Firebase credentials.' };
  }

  try {
    // Format message for FCM
    // For Android, put data in the 'data' field as per plugin requirements
    const message = {
      token: token,
      notification: {
        title: payload.title || 'Time Harbor',
        body: payload.body || payload.message || ''
      },
      data: {
        // Include all payload data in the data field for Android
        // FCM requires all data values to be strings
        title: payload.title || '',
        body: payload.body || payload.message || '',
        ...Object.keys(payload.data || {}).reduce((acc, key) => {
          const value = payload.data[key];
          acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
          return acc;
        }, {})
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
          icon: payload.icon || 'notification_icon',
          color: '#4285F4'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await messaging.send(message);
    console.log('FCM notification sent successfully:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    
    // Handle specific FCM errors
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token') {
      return { success: false, expired: true, error: error.message };
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Send Web Push notification
 * @param {Object} subscription - Web Push subscription object
 * @param {Object} payload - The notification payload
 */
async function sendWebPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    console.error('Error sending Web Push notification:', error);
    if (error.statusCode === 410) {
      // Subscription has expired or is no longer valid
      return { success: false, expired: true };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Send notifications to all team admins/leaders
 * @param {String} teamId - The team ID
 * @param {Object} notificationData - The notification data
 */
export async function notifyTeamAdmins(teamId, notificationData) {
  try {
    const team = await Teams.findOneAsync(teamId);
    if (!team) return;

    // Get all admin and leader user IDs
    const adminIds = [...(team.admins || []), team.leader].filter(Boolean);
    
    // Get users with push subscriptions
    const users = await Meteor.users.find({ 
      _id: { $in: adminIds },
      'profile.pushSubscription': { $exists: true }
    }).fetchAsync();

    const results = [];
    for (const user of users) {
      if (user.profile?.pushSubscription) {
        const subscription = user.profile.pushSubscription;
        const result = await sendPushNotification(
          subscription,
          notificationData
        );
        
        // If subscription expired, remove it
        if (result.expired) {
          await Meteor.users.updateAsync(user._id, {
            $unset: { 
              'profile.pushSubscription': '',
              'profile.pushSubscribedAt': ''
            }
          });
        }
        
        results.push({ userId: user._id, ...result });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error notifying team admins:', error);
    throw error;
  }
}

/**
 * Send a push notification to a specific user
 * @param {String} userId - The user ID
 * @param {Object} notificationData - The notification data
 */
export async function notifyUser(userId, notificationData) {
  try {
    const user = await Meteor.users.findOneAsync(userId);
    if (!user || !user.profile?.pushSubscription) {
      return { success: false, reason: 'User not found or no subscription' };
    }

    const result = await sendPushNotification(
      user.profile.pushSubscription,
      notificationData
    );
    
    // If subscription expired, remove it
    if (result.expired) {
      await Meteor.users.updateAsync(userId, {
        $unset: { 
          'profile.pushSubscription': '',
          'profile.pushSubscribedAt': ''
        }
      });
    }
    
    return { userId, ...result };
  } catch (error) {
    console.error('Error notifying user:', error);
    throw error;
  }
}

export function getVapidPublicKey() {
  return vapidKeys.publicKey;
}

