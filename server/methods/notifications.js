import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Notifications } from '../../collections.js';
import { getVapidPublicKey, notifyUser } from '../utils/pushNotifications.js';


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
    check(notificationId, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    const n = await Notifications.findOneAsync({ _id: notificationId, userId: this.userId });
    if (!n) return;
    await Notifications.updateAsync(notificationId, { $set: { read: true } });
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
    check(notificationIds, [String]);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    if (!notificationIds || notificationIds.length === 0) {
      throw new Meteor.Error('invalid-argument', 'No notification IDs provided');
    }
    // Only delete notifications that belong to the current user
    const result = await Notifications.removeAsync({ _id: { $in: notificationIds }, userId: this.userId });
    return { success: true, deletedCount: result };
  }
};
