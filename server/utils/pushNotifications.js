import webpush from 'web-push';

// VAPID keys for Web Push (generate new ones using: npx web-push generate-vapid-keys)
// IMPORTANT: In production, store these in environment variables!
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
  
};

// Configure web-push
webpush.setVapidDetails(
  'mailto:admin@timeharbor.com', // Your email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

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
 * Send notifications to all team admins
 * @param {String} teamId - The team ID
 * @param {Object} notificationData - The notification data
 */
export async function notifyTeamAdmins(teamId, notificationData) {
  const { Teams } = require('../../collections.js');
  const { Meteor } = require('meteor/meteor');
  
  try {
    const team = await Teams.findOneAsync(teamId);
    if (!team) return;

    // Get all admin user IDs
    const adminIds = team.admins || [];
    
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
        $unset: { 'profile.pushSubscription': '' }
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

