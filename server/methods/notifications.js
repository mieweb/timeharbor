import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { getVapidPublicKey } from '../utils/pushNotifications.js';
import { sendIOSPushNotification, notifyTeamAdminsIOS, sendClockEventNotificationIOS, configureIOSPushNotifications } from '../utils/iosPushNotifications.js';

export const notificationMethods = {
  /**
   * Get the VAPID public key for client-side push subscription
   */
  'getVapidPublicKey'() {
    return getVapidPublicKey();
  },

  /**
   * Subscribe a user to push notifications
   */
  async 'subscribeToPushNotifications'(subscription) {
    // Validate subscription object - allow any additional fields
    check(subscription, Object);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in to subscribe to notifications');
    }

    try {
      // Store the subscription in the user's profile
      await Meteor.users.updateAsync(this.userId, {
        $set: {
          'profile.pushSubscription': subscription,
          'profile.pushSubscribedAt': new Date()
        }
      });

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

      return { success: true };
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw new Meteor.Error('unsubscription-failed', 'Failed to unsubscribe from push notifications');
    }
  },

  /**
   * Check if user has push notifications enabled
   */
  'checkPushNotificationStatus'() {
    if (!this.userId) return { enabled: false };

    const user = Meteor.users.findOne(this.userId, {
      fields: { 'profile.pushSubscription': 1 }
    });

    return {
      enabled: !!(user?.profile?.pushSubscription)
    };
  },

  // iOS-specific notification methods
  /**
   * Register iOS push token for a user
   */
  async 'registerIOSPushToken'(token) {
    check(token, String);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in to register push token');
    }

    try {
      await Meteor.users.updateAsync(this.userId, {
        $set: {
          'profile.iosPushToken': token,
          'profile.iosPushRegisteredAt': new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error registering iOS push token:', error);
      throw new Meteor.Error('token-registration-failed', 'Failed to register iOS push token: ' + error.message);
    }
  },

  /**
   * Unregister iOS push token for a user
   */
  async 'unregisterIOSPushToken'() {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    try {
      await Meteor.users.updateAsync(this.userId, {
        $unset: {
          'profile.iosPushToken': '',
          'profile.iosPushRegisteredAt': ''
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error unregistering iOS push token:', error);
      throw new Meteor.Error('token-unregistration-failed', 'Failed to unregister iOS push token');
    }
  },

  /**
   * Check if user has iOS push notifications enabled
   */
  'checkIOSPushNotificationStatus'() {
    if (!this.userId) return { enabled: false };

    const user = Meteor.users.findOne(this.userId, {
      fields: { 'profile.iosPushToken': 1 }
    });

    return {
      enabled: !!(user?.profile?.iosPushToken)
    };
  },

  /**
   * Send test notification to iOS device
   */
  'sendTestIOSNotification'(message) {
    check(message, String);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const notificationData = {
      title: 'Time Harbor Test',
      body: message,
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    };

    return sendIOSPushNotification(this.userId, notificationData);
  }
};

