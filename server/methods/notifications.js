import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Notifications } from '../../collections.js';
import { getVapidPublicKey, notifyUser } from '../utils/pushNotifications.js';

const idStr = (id) => {
  if (!id) return '';
  return typeof id === 'string' ? id : (id._str || id.toHexString?.() || String(id));
};


export const notificationMethods = {
  /**
   * Get the VAPID public key for client-side push subscription
   */
  'getVapidPublicKey'() {
    return getVapidPublicKey();
  },


  /**
   * Get FCM Sender ID
   */
  'getFcmSenderId'() {
    return Meteor.settings.public?.fcmSenderId;
  },


  /**
   * Subscribe a user to push notifications (supports both Web Push and FCM)
   */
  async 'subscribeToPushNotifications'(subscription) {
    // Validate subscription object - allow any additional fields
    check(subscription, Object);


    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in to subscribe to notifications');
    }


    try {
      // Determine subscription type
      const subscriptionType = subscription.type || 'webpush';


      if (subscriptionType === 'fcm') {
        // Store FCM token
        await Meteor.users.updateAsync(this.userId, {
          $set: {
            'profile.pushSubscription': {
              type: 'fcm',
              token: subscription.token,
              platform: subscription.platform || 'android'
            },
            'profile.pushSubscribedAt': new Date()
          }
        });
      } else {
        // Store Web Push subscription
        await Meteor.users.updateAsync(this.userId, {
          $set: {
            'profile.pushSubscription': {
              type: 'webpush',
              ...subscription
            },
            'profile.pushSubscribedAt': new Date()
          }
        });
      }


      return { success: true };
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw new Meteor.Error('subscription-failed', 'Failed to subscribe to push notifications: ' + error.message);
    }
  },


  /**
   * Unsubscribe a user from push notifications
   */
  async 'unsubscribeFromPushNotifications'() {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }


    try {
      await Meteor.users.updateAsync(this.userId, {
        $unset: {
          'profile.pushSubscription': '',
          'profile.pushSubscribedAt': ''
        }
      });


      console.log(`[Push] User ${this.userId} unsubscribed successfully.`);
      return { success: true };
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw new Meteor.Error('unsubscription-failed', 'Failed to unsubscribe from push notifications. Please try again.');
    }
  },


  /**
   * Check if user has push notifications enabled
   */
  async 'checkPushNotificationStatus'() {
    if (!this.userId) return { enabled: false };


    const user = await Meteor.users.findOneAsync(this.userId, {
      fields: { 'profile.pushSubscription': 1 }
    });


    return {
      enabled: !!(user?.profile?.pushSubscription)
    };
  },


  /**
   * Send auto-clock-out notification to the current user
   */
  async 'notifyAutoClockOut'(durationText, teamName) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }


    try {
      const result = await notifyUser(this.userId, {
        title: 'Time Harbor - Auto Clock Out',
        body: `You were automatically clocked out as your timer reached 10 hours straight. Total time: ${durationText}`,
        icon: '/timeharbor-icon.svg',
        badge: '/timeharbor-icon.svg',
        tag: `auto-clockout-user-${this.userId}-${Date.now()}`,
        data: {
          type: 'auto-clock-out',
          userId: this.userId,
          duration: durationText,
          teamName: teamName,
          autoClockOut: true,
          url: '/tickets'
        }
      });


      return result;
    } catch (error) {
      console.error('Error sending auto-clock-out notification to user:', error);
      throw new Meteor.Error('notification-failed', 'Failed to send notification');
    }
  },

  /**
   * Mark a single notification as read (inbox)
   */
  async 'notifications.markAsRead'(notificationId) {
    check(notificationId, Match.Any);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    if (notificationId === undefined || notificationId === null) {
      throw new Meteor.Error('invalid-argument', 'notificationId is required');
    }
    const targetId = idStr(notificationId);
    const notifications = await Notifications.find({ userId: this.userId }, { fields: { _id: 1 } }).fetchAsync();
    const match = notifications.find((n) => idStr(n._id) === targetId);
    if (!match) return;
    await Notifications.updateAsync(match._id, { $set: { read: true } });
  },

  /**
   * Mark all notifications as read for the current user
   */
  async 'notifications.markAllAsRead'() {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    await Notifications.updateAsync({ userId: this.userId, read: false }, { $set: { read: true } }, { multi: true });
  },

  /**
   * Delete one or more notifications for the current user
   */
  async 'notifications.delete'(notificationIds) {
    check(notificationIds, Match.Any);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    const idsInput = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
    if (!idsInput || idsInput.length === 0) {
      throw new Meteor.Error('invalid-argument', 'No notification IDs provided');
    }
    // Normalize IDs and resolve against user's actual notification IDs (supports string + ObjectID records)
    const requestedIds = new Set(idsInput.map(id => idStr(id)).filter(Boolean));
    const userNotifications = await Notifications.find({ userId: this.userId }, { fields: { _id: 1 } }).fetchAsync();
    const removableIds = userNotifications
      .filter((n) => requestedIds.has(idStr(n._id)))
      .map((n) => n._id);
    if (removableIds.length === 0) {
      return { success: true, deletedCount: 0 };
    }
    // Only delete notifications that belong to the current user
    const result = await Notifications.removeAsync({ _id: { $in: removableIds }, userId: this.userId });
    return { success: true, deletedCount: result };
  }
};
