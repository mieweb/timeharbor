import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { currentScreen } from '../auth/AuthPage.js';
import { currentRouteTemplate } from '../../routes.js';
import { ClockEvents, Teams } from '../../../collections.js';
import { dateToLocalString } from '../../utils/DateUtils.js';

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
    this.midnightWarningKeys = new Set();
    this.midnightAutoClockOut = new Set();

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

    // Auto clock-out at local midnight with warning at 11:59 PM
    this.autorun(() => {
      const userId = Meteor.userId();
      if (!userId) return;

      const nowMs = currentTime.get();
      const nowDate = new Date(nowMs);
      const todayKey = dateToLocalString(nowDate);

      const activeEvents = ClockEvents.find({ userId, endTime: null }).fetch();
      const activeEventIds = new Set(activeEvents.map(e => e._id));

      // Cleanup flags for inactive events
      this.midnightAutoClockOut.forEach((eventId) => {
        if (!activeEventIds.has(eventId)) {
          this.midnightAutoClockOut.delete(eventId);
        }
      });
      this.midnightWarningKeys.forEach((key) => {
        const [eventId] = key.split(':');
        if (!activeEventIds.has(eventId)) {
          this.midnightWarningKeys.delete(key);
        }
      });

      activeEvents.forEach((event) => {
        const startDate = new Date(event.startTimestamp);
        const sameDay =
          startDate.getFullYear() === nowDate.getFullYear() &&
          startDate.getMonth() === nowDate.getMonth() &&
          startDate.getDate() === nowDate.getDate();

        if (sameDay) {
          if (nowDate.getHours() === 23 && nowDate.getMinutes() === 59) {
            const warnKey = `${event._id}:${todayKey}`;
            if (!this.midnightWarningKeys.has(warnKey)) {
              this.midnightWarningKeys.add(warnKey);
              alert('Day is ending. Your clock will stop at 12:00 AM. If you continue working, please clock in again.');
            }
          }
          return;
        }

        if (this.midnightAutoClockOut.has(event._id)) return;
        this.midnightAutoClockOut.add(event._id);

        Meteor.call('clockEventStop', event.teamId, (err) => {
          if (err) {
            console.error('Midnight auto clock-out failed:', err);
            this.midnightAutoClockOut.delete(event._id);
            return;
          }

          alert('Your session was automatically clocked out at midnight. If you are still working, please clock in again.');
        });
      });
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
    },
    isTeamAdmin() {
      return !!Teams.findOne({ admins: Meteor.userId() });
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
    'click #themeToggle'(event) {
      event.preventDefault();
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      // Update icon
      const icon = document.getElementById('themeIcon');
      if (icon) {
        icon.className = newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
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

  // Update theme icon on template render
  Template.mainLayout.onRendered(function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.className = currentTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  });
}

Template.body.helpers({
  currentScreen() {
    return currentScreen.get();
  },
});