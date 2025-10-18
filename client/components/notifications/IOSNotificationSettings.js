// iOS Notification Settings Component
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { registerForIOSPushNotifications, unregisterFromIOSPushNotifications, checkIOSPushNotificationStatus, sendTestIOSNotification } from '../utils/IOSNotificationUtils.js';

Template.iosNotificationSettings.onCreated(function() {
  this.loading = new ReactiveVar(false);
  this.notificationEnabled = new ReactiveVar(false);
  this.error = new ReactiveVar(null);

  // Check initial status
  this.autorun(() => {
    checkIOSPushNotificationStatus()
      .then(status => {
        this.notificationEnabled.set(status.enabled);
      })
      .catch(error => {
        console.error('Error checking iOS notification status:', error);
        this.error.set('Failed to check notification status');
      });
  });
});

Template.iosNotificationSettings.helpers({
  loading() {
    return Template.instance().loading.get();
  },
  
  notificationEnabled() {
    return Template.instance().notificationEnabled.get();
  },
  
  error() {
    return Template.instance().error.get();
  },
  
  isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
});

Template.iosNotificationSettings.events({
  async 'click #enableIOSNotifications'(event, templateInstance) {
    event.preventDefault();
    templateInstance.loading.set(true);
    templateInstance.error.set(null);

    try {
      await registerForIOSPushNotifications();
      templateInstance.notificationEnabled.set(true);
      alert('✅ iOS Notifications enabled! You will now receive alerts when team members clock in/out.');
    } catch (error) {
      console.error('Failed to enable iOS notifications:', error);
      let errorMessage = '❌ Failed to enable iOS notifications. ';
      
      if (error.message.includes('permission denied')) {
        errorMessage += 'Please allow notifications in your iOS settings.';
      } else if (error.message.includes('not supported')) {
        errorMessage += 'iOS push notifications are not supported on this device.';
      } else {
        errorMessage += 'Error: ' + error.message;
      }
      
      templateInstance.error.set(errorMessage);
    } finally {
      templateInstance.loading.set(false);
    }
  },

  async 'click #disableIOSNotifications'(event, templateInstance) {
    event.preventDefault();
    
    if (!confirm('Are you sure you want to disable iOS push notifications?')) {
      return;
    }

    templateInstance.loading.set(true);
    templateInstance.error.set(null);

    try {
      await unregisterFromIOSPushNotifications();
      templateInstance.notificationEnabled.set(false);
      alert('iOS Notifications disabled.');
    } catch (error) {
      console.error('Failed to disable iOS notifications:', error);
      templateInstance.error.set('Failed to disable iOS notifications. Please try again.');
    } finally {
      templateInstance.loading.set(false);
    }
  },

  async 'click #testIOSNotification'(event, templateInstance) {
    event.preventDefault();
    
    const message = prompt('Enter test message:', 'This is a test notification from Time Harbor');
    if (!message) return;

    templateInstance.loading.set(true);
    templateInstance.error.set(null);

    try {
      await sendTestIOSNotification(message);
      alert('✅ Test notification sent! Check your device.');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      templateInstance.error.set('Failed to send test notification. Please try again.');
    } finally {
      templateInstance.loading.set(false);
    }
  }
});
