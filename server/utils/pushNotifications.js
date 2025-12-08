import webpush from 'web-push';
import { Meteor } from 'meteor/meteor';
import admin from 'firebase-admin';

// VAPID keys for Web Push (loaded from settings.json)
// IMPORTANT: In production, store these in settings.json!
// Run Meteor with: meteor --settings settings.json
const vapidKeys = {
  publicKey: Meteor.settings.public?.vapidPublicKey,
  privateKey: Meteor.settings.private?.VAPID_PRIVATE_KEY
};

// Configure web-push
webpush.setVapidDetails(
  'mailto:admin@timeharbor.com', // Your email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Initialize Firebase Admin SDK for FCM
let firebaseInitialized = false;
function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    const serviceAccount = {
      projectId: Meteor.settings.private?.FCM_PROJECT_ID,
      privateKey: Meteor.settings.private?.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: Meteor.settings.private?.FCM_CLIENT_EMAIL
    };

    if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      console.log('Firebase Admin SDK initialized for FCM');
    } else {
      console.warn('Firebase credentials not found in settings.json. FCM notifications will not work.');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
}

// Initialize on startup
Meteor.startup(() => {
  initializeFirebase();
});

/**
 * Send FCM notification to mobile device
 */
async function sendFCMNotification(registrationId, payload) {
  if (!firebaseInitialized) {
    throw new Error('Firebase Admin SDK not initialized');
  }

  try {
    const message = {
      token: registrationId,
      notification: {
        title: payload.title,
        body: payload.body
      },
      data: {
        ...payload.data,
        click_action: payload.data?.url || 'FLUTTER_NOTIFICATION_CLICK'
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      }
    };

    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    if (error.code === 'messaging/registration-token-not-registered') {
      return { success: false, expired: true };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Send a push notification (supports both Web Push and FCM)
 * @param {Object} subscription - The push subscription object
 * @param {Object} payload - The notification payload
 */
export async function sendPushNotification(subscription, payload) {
  // Check if it's a mobile FCM subscription
  if (subscription.type === 'fcm' || subscription.registrationId) {
    initializeFirebase();
    return await sendFCMNotification(
      subscription.registrationId || subscription.token,
      payload
    );
  }

  // Otherwise, use Web Push
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
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
  const { Teams } = require('../../collections.js');
  const { Meteor } = require('meteor/meteor');
  
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
        const result = await sendPushNotification(
          user.profile.pushSubscription,
          notificationData
        );
        
        // If subscription expired, remove it
        if (result.expired) {
          await Meteor.users.updateAsync(user._id, {
            $unset: { 'profile.pushSubscription': '', 'profile.pushSubscribedAt': '' }
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
  const { Meteor } = require('meteor/meteor');
  
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
        $unset: { 'profile.pushSubscription': '', 'profile.pushSubscribedAt': '' }
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

