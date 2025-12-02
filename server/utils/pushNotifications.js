import webpush from 'web-push';
import { Meteor } from 'meteor/meteor';
import admin from 'firebase-admin';

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

// Initialize Firebase Admin for mobile push (FCM)
let firebaseInitialized = false;
function initializeFirebase() {
  if (firebaseInitialized) {
    return;
  }
  
  const fcmProjectId = Meteor.settings.private?.FCM_PROJECT_ID || process.env.FCM_PROJECT_ID;
  const fcmPrivateKey = Meteor.settings.private?.FCM_PRIVATE_KEY || process.env.FCM_PRIVATE_KEY;
  const fcmClientEmail = Meteor.settings.private?.FCM_CLIENT_EMAIL || process.env.FCM_CLIENT_EMAIL;
  
  if (fcmProjectId && fcmPrivateKey && fcmClientEmail) {
    try {
      if (!admin.apps.length) {
        const serviceAccount = {
          projectId: fcmProjectId,
          privateKey: fcmPrivateKey.replace(/\\n/g, '\n'),
          clientEmail: fcmClientEmail
        };
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
      firebaseInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error.message);
    }
  }
}

/**
 * Send a push notification to a specific subscription
 * @param {Object} subscription - The push subscription object
 * @param {Object} payload - The notification payload
 */
export async function sendPushNotification(subscription, payload) {
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
 * Supports both web push and mobile push
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
    
    // Get users with web push subscriptions OR mobile devices
    const users = await Meteor.users.find({ 
      _id: { $in: adminIds },
      $or: [
        { 'profile.pushSubscription': { $exists: true } },
        { 'profile.mobileDevices': { $exists: true, $ne: [] } }
      ]
    }).fetchAsync();

    const results = [];
    for (const user of users) {
      // Send web push notification (if exists)
      if (user.profile?.pushSubscription) {
        const webResult = await sendPushNotification(
          user.profile.pushSubscription,
          notificationData
        );
        
        // If subscription expired, remove it
        if (webResult.expired) {
          await Meteor.users.updateAsync(user._id, {
            $unset: { 'profile.pushSubscription': '', 'profile.pushSubscribedAt': '' }
          });
        }
        
        results.push({ userId: user._id, type: 'web', ...webResult });
      }

      // Send mobile push notifications (if exists)
      if (user.profile?.mobileDevices && user.profile.mobileDevices.length > 0) {
        for (const device of user.profile.mobileDevices) {
          const mobileResult = await sendMobilePush(device.token, notificationData);
          
          // If token expired, remove it
          if (mobileResult.expired) {
            await Meteor.users.updateAsync(user._id, {
              $pull: { 'profile.mobileDevices': { token: device.token } }
            });
          }
          
          results.push({ 
            userId: user._id, 
            type: 'mobile', 
            platform: device.platform,
            ...mobileResult 
          });
        }
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
 * Supports both web push and mobile push
 * @param {String} userId - The user ID
 * @param {Object} notificationData - The notification data
 */
export async function notifyUser(userId, notificationData) {
  const { Meteor } = require('meteor/meteor');
  
  try {
    const user = await Meteor.users.findOneAsync(userId);
    if (!user) {
      return { success: false, reason: 'User not found' };
    }

    const results = [];

    // Send web push notification (if exists)
    if (user.profile?.pushSubscription) {
      const webResult = await sendPushNotification(
        user.profile.pushSubscription,
        notificationData
      );
      
      // If subscription expired, remove it
      if (webResult.expired) {
        await Meteor.users.updateAsync(userId, {
          $unset: { 'profile.pushSubscription': '', 'profile.pushSubscribedAt': '' }
        });
      }
      
      results.push({ type: 'web', ...webResult });
    }

    // Send mobile push notifications (if exists)
    if (user.profile?.mobileDevices && user.profile.mobileDevices.length > 0) {
      for (const device of user.profile.mobileDevices) {
        const mobileResult = await sendMobilePush(device.token, notificationData);
        
        // If token expired, remove it
        if (mobileResult.expired) {
          await Meteor.users.updateAsync(userId, {
            $pull: { 'profile.mobileDevices': { token: device.token } }
          });
        }
        
        results.push({ type: 'mobile', platform: device.platform, ...mobileResult });
      }
    }

    // Return success if at least one notification was sent
    const hasSuccess = results.some(r => r.success);
    return { 
      success: hasSuccess, 
      results,
      reason: hasSuccess ? undefined : 'No valid subscriptions found'
    };
  } catch (error) {
    console.error('Error notifying user:', error);
    throw error;
  }
}

/**
 * Send push notification to mobile device using FCM
 * Works for both Android and iOS
 * @param {String} deviceToken - The FCM device token
 * @param {Object} notificationData - The notification data
 */
export async function sendMobilePush(deviceToken, notificationData) {
  try {
    initializeFirebase();
    
    if (!firebaseInitialized) {
      return { success: false, error: 'Firebase not initialized' };
    }
    
    const message = {
      notification: {
        title: notificationData.title || 'Time Harbor',
        body: notificationData.body || ''
      },
      data: {
        type: String(notificationData.data?.type || ''),
        userId: String(notificationData.data?.userId || ''),
        userName: String(notificationData.data?.userName || ''),
        teamName: String(notificationData.data?.teamName || ''),
        teamId: String(notificationData.data?.teamId || ''),
        clockEventId: String(notificationData.data?.clockEventId || ''),
        duration: String(notificationData.data?.duration || ''),
        url: String(notificationData.data?.url || '/'),
        autoClockOut: String(notificationData.data?.autoClockOut || 'false')
      },
      token: deviceToken,
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
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
    // Handle invalid/expired token
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      return { success: false, expired: true, error: error.message };
    }
    
    console.error('Error sending mobile push notification:', error.message);
    return { success: false, error: error.message };
  }
}

export function getVapidPublicKey() {
  return vapidKeys.publicKey;
}

