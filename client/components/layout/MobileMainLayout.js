// Mobile Main Layout for iOS
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { initializeIOSPushNotifications } from '../utils/IOSNotificationUtils.js';

Template.mobileMainLayout.onCreated(function() {
  this.isIOS = new ReactiveVar(false);
  this.isMobile = new ReactiveVar(false);
  
  // Detect iOS device
  this.autorun(() => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    this.isIOS.set(isIOS);
    this.isMobile.set(isMobile);
    
    // Initialize iOS push notifications if on iOS
    if (isIOS) {
      initializeIOSPushNotifications().catch(error => {
        console.error('Failed to initialize iOS push notifications:', error);
      });
    }
  });
});

Template.mobileMainLayout.helpers({
  isIOS() {
    return Template.instance().isIOS.get();
  },
  
  isMobile() {
    return Template.instance().isMobile.get();
  },
  
  isDesktop() {
    return !Template.instance().isMobile.get();
  }
});

Template.mobileMainLayout.events({
  'click .mobile-menu-toggle'(event) {
    event.preventDefault();
    const sidebar = document.querySelector('.mobile-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('hidden');
    }
  },
  
  'click .mobile-overlay'(event) {
    const sidebar = document.querySelector('.mobile-sidebar');
    if (sidebar) {
      sidebar.classList.add('hidden');
    }
  }
});
