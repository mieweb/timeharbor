import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { currentScreen, isLogoutLoading, logoutMessage } from '../auth/AuthPage.js';

// Reactive variable to track the current template
const currentTemplate = new ReactiveVar('home');

// Reactive variable to track current time for timers
export const currentTime = new ReactiveVar(Date.now());
setInterval(() => currentTime.set(Date.now()), 1000);

// Reactive variable to track subscription loading state
export const isTeamsLoading = new ReactiveVar(true);

// Safety check for template
if (Template.mainLayout) {
  Template.mainLayout.onCreated(function () {
    this.autorun(() => {
      if (!Meteor.userId()) {
        currentScreen.set('authPage');
      } else {
        currentScreen.set('mainLayout');
        // Subscribe to userTeams when user is logged in
        const teamsHandle = this.subscribe('userTeams');
        isTeamsLoading.set(!teamsHandle.ready());
      }
    });
  });

Template.mainLayout.helpers({
  main() {
    return currentTemplate.get();
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
    const target = event.currentTarget.getAttribute('href').substring(1);
    currentTemplate.set(target || 'home');
  },
  'click #logoutBtn'(event, instance) {
    event.preventDefault();
    if (isLogoutLoading.get()) return;
    if (confirm('Are you sure you want to log out?')) {
      isLogoutLoading.set(true);
      Meteor.logout((err) => {
        isLogoutLoading.set(false);
        if (err) {
          logoutMessage.set('Logout failed: ' + (err.reason || err.message));
        } else {
          logoutMessage.set('You have been logged out successfully.');
          // Redirect to login/auth page
          currentScreen.set('authPage');
          currentTemplate.set('home');
        }
        setTimeout(() => logoutMessage.set(''), 3000);
      });
    }
  }
});

Template.body.helpers({
  currentScreen() {
    return currentScreen.get();
  },
});
}