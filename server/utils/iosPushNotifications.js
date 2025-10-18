// iOS Push Notification utilities for Time Harbor
import { Push } from 'meteor/activitree:push';

/**
 * Send push notification to iOS devices
 * @param {String} userId - The user ID to send notification to
 * @param {Object} notificationData - The notification payload
 */
export function sendIOSPushNotification(userId, notificationData) {
  try {
    // Send push notification using activitree:push
    Push.send({
      from: 'Time Harbor',
      title: notificationData.title,
      text: notificationData.body,
      badge: notificationData.badge || 1,
      sound: notificationData.sound || 'default',
      payload: notificationData.data || {},
      query: {
        userId: userId
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error sending iOS push notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notifications to all team admins/leaders on iOS
 * @param {String} teamId - The team ID
 * @param {Object} notificationData - The notification data
 */
export async function notifyTeamAdminsIOS(teamId, notificationData) {
  const { Teams } = require('../../collections.js');
  const { Meteor } = require('meteor/meteor');
  
  try {
    const team = await Teams.findOneAsync(teamId);
    if (!team) return;

    // Get all admin and leader user IDs
    const adminIds = [...(team.admins || []), team.leader].filter(Boolean);
    
    // Get users with iOS push tokens
    const users = await Meteor.users.find({ 
      _id: { $in: adminIds },
      'profile.iosPushToken': { $exists: true }
    }).fetchAsync();

    const results = [];
    for (const user of users) {
      if (user.profile?.iosPushToken) {
        const result = sendIOSPushNotification(user._id, notificationData);
        results.push({ userId: user._id, ...result });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error notifying team admins on iOS:', error);
    throw error;
  }
}

/**
 * Send notification for clock events (iOS)
 * @param {String} userId - User who clocked in/out
 * @param {String} teamId - Team ID
 * @param {String} type - 'clock-in' or 'clock-out'
 * @param {Object} additionalData - Additional data like duration
 */
export function sendClockEventNotificationIOS(userId, teamId, type, additionalData = {}) {
  const { Meteor } = require('meteor/meteor');
  
  // Get user info
  const user = Meteor.users.findOne(userId);
  const team = Teams.findOne(teamId);
  
  if (!user || !team) return;

  const userName = user.profile?.name || user.username || 'Unknown User';
  const teamName = team.name;

  let title, body;
  
  if (type === 'clock-in') {
    title = '🟢 Clock In Alert';
    body = `${userName} clocked in to ${teamName}`;
  } else if (type === 'clock-out') {
    title = '🔴 Clock Out Alert';
    const duration = additionalData.duration ? ` (${additionalData.duration})` : '';
    body = `${userName} clocked out of ${teamName}${duration}`;
  }

  const notificationData = {
    title,
    body,
    data: {
      type,
      userId,
      teamId,
      userName,
      teamName,
      ...additionalData
    },
    badge: 1,
    sound: 'default'
  };

  // Send to team admins/leaders
  return notifyTeamAdminsIOS(teamId, notificationData);
}

/**
 * Configure iOS push notifications
 */
export function configureIOSPushNotifications() {
  // Configure push notification settings
  Push.Configure({
    android: {
      senderID: 'YOUR_FIREBASE_SENDER_ID', // Will be replaced with actual Sender ID
      alert: true,
      badge: true,
      sound: true,
      vibrate: true,
      clearNotifications: true
    },
    ios: {
      alert: true,
      badge: true,
      sound: true,
      clearBadge: true
    }
  });
}

export { Push };
