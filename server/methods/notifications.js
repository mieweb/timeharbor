import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { getVapidPublicKey, notifyUser } from '../utils/pushNotifications.js';

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
   * Register mobile device token for push notifications
   * Works for both Android and iOS
   */
  async 'registerMobileDeviceToken'(deviceToken, platform) {
    check(deviceToken, String);
    check(platform, Match.OneOf('android', 'ios'));

    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    try {
      const user = await Meteor.users.findOneAsync(this.userId);
      const existingDevices = user.profile?.mobileDevices || [];
      
      // Check if token already exists
      const existingDevice = existingDevices.find(d => d.token === deviceToken);
      
      if (existingDevice) {
        // Update existing device
        await Meteor.users.updateAsync(
          { _id: this.userId, 'profile.mobileDevices.token': deviceToken },
          {
            $set: {
              'profile.mobileDevices.$.platform': platform,
              'profile.mobileDevices.$.updatedAt': new Date()
            }
          }
        );
      } else {
        // Add new device
        await Meteor.users.updateAsync(this.userId, {
          $push: {
            'profile.mobileDevices': {
              token: deviceToken,
              platform: platform,
              registeredAt: new Date(),
              updatedAt: new Date()
            }
          }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error registering mobile device token:', error);
      throw new Meteor.Error('registration-failed', 'Failed to register device token');
    }
  },

  /**
   * Unregister mobile device token
   */
  async 'unregisterMobileDeviceToken'(deviceToken) {
    check(deviceToken, String);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    try {
      await Meteor.users.updateAsync(this.userId, {
        $pull: {
          'profile.mobileDevices': { token: deviceToken }
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error unregistering mobile device token:', error);
      throw new Meteor.Error('unregistration-failed', 'Failed to unregister device token');
    }
  },

  /**
   * Check if user has push notifications enabled (web or mobile)
   */
  'checkPushNotificationStatus'() {
    if (!this.userId) return { enabled: false };

    const user = Meteor.users.findOne(this.userId, {
      fields: { 
        'profile.pushSubscription': 1,
        'profile.mobileDevices': 1
      }
    });

    const hasWebPush = !!(user?.profile?.pushSubscription);
    const hasMobileDevices = !!(user?.profile?.mobileDevices?.length > 0);

    return {
      enabled: hasWebPush || hasMobileDevices,
      webPush: hasWebPush,
      mobileDevices: hasMobileDevices,
      deviceCount: user?.profile?.mobileDevices?.length || 0
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

};

