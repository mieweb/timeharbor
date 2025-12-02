import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import {
  isPushNotificationSupported,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkNotificationStatus
} from '../../utils/NotificationUtils.js';
import {
  isMobilePushAvailable,
  getPushRegistrationStatus,
  unregisterMobilePush
} from '../../utils/MobilePushNotifications.js';

import './NotificationSettings.html';

Template.notificationSettings.onCreated(function() {
  this.notificationSupported = new ReactiveVar(false);
  this.notificationEnabled = new ReactiveVar(false);
  this.loading = new ReactiveVar(false);
  this.isMobile = new ReactiveVar(false);

  // Function to check if mobile
  const checkMobile = () => {
    const isCordova = typeof cordova !== 'undefined';
    const hasDevice = typeof device !== 'undefined';
    const hasPlatformId = isCordova && cordova.platformId;
    const hasPushPlugin = typeof PushNotification !== 'undefined';
    const isMobileDevice = isCordova && (hasDevice || hasPlatformId || hasPushPlugin);
    
    this.isMobile.set(isMobileDevice);
    return isMobileDevice;
  };

  // Initial check
  checkMobile();

  // Re-check after a delay (in case deviceready hasn't fired yet)
  setTimeout(() => {
    const wasMobile = this.isMobile.get();
    const nowMobile = checkMobile();
    if (!wasMobile && nowMobile) {
      this.autorun(() => {
        if (this.isMobile.get()) {
          getPushRegistrationStatus().then(status => {
            this.notificationSupported.set(status.available);
            this.notificationEnabled.set(status.registered);
          });
        }
      });
    }
  }, 2000);

  // Check notification status
  this.autorun(async () => {
    if (this.isMobile.get()) {
      const status = await getPushRegistrationStatus();
      this.notificationSupported.set(status.available);
      this.notificationEnabled.set(status.registered);
    } else {
      const status = await checkNotificationStatus();
      this.notificationSupported.set(status.supported);
      this.notificationEnabled.set(status.subscribed && status.permission === 'granted');
    }
  });
});

Template.notificationSettings.helpers({
  notificationSupported() {
    return Template.instance().notificationSupported.get();
  },
  notificationEnabled() {
    return Template.instance().notificationEnabled.get();
  },
  loading() {
    return Template.instance().loading.get();
  },
  isMobile() {
    return Template.instance().isMobile.get();
  }
});

Template.notificationSettings.events({
  async 'click #enableNotifications'(event, templateInstance) {
    event.preventDefault();
    templateInstance.loading.set(true);

    try {
      if (templateInstance.isMobile.get()) {
        // Mobile: Push notifications are automatically registered when device is ready
        // Just check status and show message
        const status = await getPushRegistrationStatus();
        if (status.registered) {
          templateInstance.notificationEnabled.set(true);
          templateInstance.notificationSupported.set(true);
          alert('✅ Push notifications are enabled! You will receive alerts when team members clock in/out.');
        } else if (status.available) {
          alert('⚠️ Push notifications are available but not yet registered. The app is still initializing. Please wait a moment and try again, or check your device notification permissions in Settings.');
        } else {
          alert('❌ Push notifications are not available. Make sure you\'re using the mobile app (not the web browser) and that notification permissions are enabled in your device settings.');
        }
      } else {
        // Web: Use existing web push
        await subscribeToPushNotifications();
        templateInstance.notificationEnabled.set(true);
        alert('✅ Notifications enabled! You will now receive alerts when team members clock in/out.');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      let errorMessage = '❌ Failed to enable notifications. ';
      
      if (error.message.includes('permission denied')) {
        errorMessage += 'Please allow notifications in your browser settings.';
      } else if (error.message.includes('not supported')) {
        errorMessage += 'Your browser does not support push notifications.';
      } else {
        errorMessage += 'Error: ' + error.message;
      }
      
      alert(errorMessage);
    } finally {
      templateInstance.loading.set(false);
    }
  },

  async 'click #disableNotifications'(event, templateInstance) {
    event.preventDefault();
    
    if (!confirm('Are you sure you want to disable push notifications?')) {
      return;
    }

    templateInstance.loading.set(true);

    try {
      if (templateInstance.isMobile.get()) {
        // Mobile: Unregister
        await unregisterMobilePush();
        // Also remove from server
        Meteor.call('checkPushNotificationStatus', (err, status) => {
          if (!err && status.mobileDevices) {
            // Unregister all mobile devices
            status.mobileDevices.forEach(device => {
              Meteor.call('unregisterMobileDeviceToken', device.token);
            });
          }
        });
      } else {
        // Web: Unsubscribe
        await unsubscribeFromPushNotifications();
      }
      
      templateInstance.notificationEnabled.set(false);
      alert('Notifications disabled.');
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      alert('Failed to disable notifications. Please try again.');
    } finally {
      templateInstance.loading.set(false);
    }
  }
});

