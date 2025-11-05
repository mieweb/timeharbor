import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { currentScreen } from '../auth/AuthPage.js';
import { currentRouteTemplate } from '../../routes.js';

const MESSAGE_TIMEOUT = 3000;
const ERROR_PREFIX = 'Logout failed: ';

const isLogoutLoading = new ReactiveVar(false);
const logoutMessage = new ReactiveVar('');

export const currentTime = new ReactiveVar(Date.now());
setInterval(() => currentTime.set(Date.now()), 1000);

export const isTeamsLoading = new ReactiveVar(true);
export const isClockEventsLoading = new ReactiveVar(true);

const handleLogoutResult = (error) => {
  isLogoutLoading.set(false);
  
  if (error) {
    // Show error message and auto-clear after timeout
    logoutMessage.set(`${ERROR_PREFIX}${error.reason || error.message}`);
    setTimeout(() => logoutMessage.set(''), MESSAGE_TIMEOUT);
  } else {
    // Success - just redirect, no message needed
    currentScreen.set('authPage');
  }
};

if (Template.mainLayout) {
  Template.mainLayout.onCreated(function () {
    this.autorun(() => {
      if (!Meteor.userId()) {
        currentScreen.set('authPage');
      } else {
        currentScreen.set('mainLayout');
        // Subscribe to common data when user is logged in
        const teamsHandle = this.subscribe('userTeams');
        const clockEventsHandle = this.subscribe('clockEventsForUser');
        
        // Update loading states
        isTeamsLoading.set(!teamsHandle.ready());
        isClockEventsLoading.set(!clockEventsHandle.ready());
      }
    });
  });

  Template.mainLayout.helpers({
    main() {
      // All routes now use Flow Router
      return currentRouteTemplate.get();
    },
    currentUser() {
      return Meteor.user();
    },
    isLogoutLoading() {
      return isLogoutLoading.get();
    },
    logoutMessage() {
      return logoutMessage.get();
    },
    logoutBtnAttrs() {
      return isLogoutLoading.get() ? { disabled: true } : {};
    }
  });

  Template.mainLayout.events({
    'click nav a'(event) {
      event.preventDefault();
      const href = event.currentTarget.getAttribute('href');
      const target = href.substring(1);
      
      // Handle navigation clicks
      if (href === '/' || target === 'home' || target === '') {
        FlowRouter.go('/');
      } else if (href === '/teams' || target === 'teams') {
        FlowRouter.go('/teams');
      } else if (href === '/tickets' || target === 'tickets') {
        FlowRouter.go('/tickets');
      } else if (href === '/calendar' || target === 'calendar') {
        FlowRouter.go('/calendar');
      } else if (href === '/admin' || target === 'admin') {
        FlowRouter.go('/admin');
      } else {
        FlowRouter.go('/');
      }
    },
    'click #logoutBtn'(event, instance) {
      event.preventDefault();
      
      // Early return if already loading or user cancels
      if (isLogoutLoading.get() || !confirm('Are you sure you want to log out?')) {
        return;
      }
      
      // Start logout process
      isLogoutLoading.set(true);
      Meteor.logout(handleLogoutResult);
    }
  });
}

Template.body.helpers({
  currentScreen() {
    return currentScreen.get();
  },
});
