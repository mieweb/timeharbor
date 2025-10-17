import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import {
  isPushNotificationSupported,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkNotificationStatus
} from '../../utils/NotificationUtils.js';

import './NotificationSettings.html';

Template.notificationSettings.onCreated(function() {
  this.notificationSupported = new ReactiveVar(false);
  this.notificationEnabled = new ReactiveVar(false);
  this.loading = new ReactiveVar(false);

  // Check notification status on creation
  this.autorun(async () => {
    const status = await checkNotificationStatus();
    this.notificationSupported.set(status.supported);
    this.notificationEnabled.set(status.subscribed && status.permission === 'granted');
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
  }
});

Template.notificationSettings.events({
  async 'click #enableNotifications'(event, templateInstance) {
    event.preventDefault();
    templateInstance.loading.set(true);

    try {
      await subscribeToPushNotifications();
      templateInstance.notificationEnabled.set(true);
      alert('✅ Notifications enabled! You will now receive alerts when team members clock in/out.');
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
      await unsubscribeFromPushNotifications();
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

