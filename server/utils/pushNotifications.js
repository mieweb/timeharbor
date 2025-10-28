import webpush from 'web-push';

// VAPID keys for Web Push (generate new ones using: npx web-push generate-vapid-keys)
// IMPORTANT: In production, store these in environment variables!
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};
const hasVapidKeys = Boolean(vapidKeys.publicKey && vapidKeys.privateKey);

// Configure web-push
if (hasVapidKeys) {
  webpush.setVapidDetails(
    'mailto:admin@timeharbor.com', // Your email
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} else {
  console.warn('[pushNotifications] VAPID keys are not set; push notifications are disabled.');
}

/**
 * Send a push notification to a specific subscription
 * @param {Object} subscription - The push subscription object
 * @param {Object} payload - The notification payload
 */
export async function sendPushNotification(subscription, payload) {
  if (!hasVapidKeys) {
    return { success: false, error: 'Push notifications not configured' };
  }
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
  if (!hasVapidKeys) {
    console.warn('[pushNotifications] Skipping notifyTeamAdmins because VAPID keys are missing.');
    return [];
  }
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
            $unset: { 'profile.pushSubscription': '' }
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

export function getVapidPublicKey() {
  return vapidKeys.publicKey || null;
}
