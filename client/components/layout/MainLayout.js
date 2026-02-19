import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { currentScreen } from '../auth/AuthPage.js';
import { currentRouteTemplate } from '../../routes.js';
import { ClockEvents, Teams, Notifications } from '../../../collections.js';
import { dateToLocalString } from '../../utils/DateUtils.js';
import { Session } from 'meteor/session';
import { sessionManager } from '../../utils/clockSession.js';

const MESSAGE_TIMEOUT = 3000;
const ERROR_PREFIX = 'Logout failed: ';

const isLogoutLoading = new ReactiveVar(false);
const logoutMessage = new ReactiveVar('');

const STORAGE_TEAM_ID = 'timeharbor-current-team-id';
export const selectedTeamId = new ReactiveVar(null);

export const currentTime = new ReactiveVar(Date.now());
setInterval(() => currentTime.set(Date.now()), 1000);

export const isTeamsLoading = new ReactiveVar(true);
export const isClockEventsLoading = new ReactiveVar(true);

function formatSessionDuration(seconds) {
  if (typeof seconds !== 'number' || seconds < 0) return { duration: '0:00', format: 'mm:ss' };
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return { duration: `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, format: 'h:mm:ss' };
  }
  return { duration: `${m}:${String(s).padStart(2, '0')}`, format: 'mm:ss' };
}

function formatTimeHoursMinutes(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

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

    const savedTeamId = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_TEAM_ID);
    if (savedTeamId) selectedTeamId.set(savedTeamId);

    this.autorun(() => {
      if (!Meteor.userId()) {
        currentScreen.set('authPage');
      } else {
        currentScreen.set('mainLayout');
        // Subscribe to common data when user is logged in
        const teamsHandle = this.subscribe('userTeams');
        const clockEventsHandle = this.subscribe('clockEventsForUser');
        this.subscribe('notifications.inbox');

        isTeamsLoading.set(!teamsHandle.ready());
        isClockEventsLoading.set(!clockEventsHandle.ready());

        if (!currentRouteTemplate.get()) {
          currentRouteTemplate.set('home');
        }
        const teams = Teams.find({}).fetch();
        if (teams.length > 0 && !selectedTeamId.get()) {
          const first = teams[0]._id;
          selectedTeamId.set(first);
          if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_TEAM_ID, first);
        }
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
    },
    currentPath() {
      const route = FlowRouter.current();
      return (route && route.path) ? route.path : '/';
    },
    isActiveRoute(pathOrRoute) {
      const current = FlowRouter.current();
      const path = (current && current.path) ? current.path : '/';
      if (pathOrRoute === '/' || pathOrRoute === 'home') return path === '/';
      return path === pathOrRoute || path === '/' + pathOrRoute;
    },
    userTeamsList() {
      return Teams.find({}).fetch();
    },
    unreadNotificationCount() {
      return Notifications.find({ userId: Meteor.userId(), read: false }).count();
    },
    unreadNotificationBadge() {
      const n = Notifications.find({ userId: Meteor.userId(), read: false }).count();
      return n > 99 ? '99+' : n;
    },
    currentTeamName() {
      const id = selectedTeamId.get();
      if (!id) return null;
      const team = Teams.findOne(id);
      return team ? team.name : null;
    },
    activeClockEvent() {
      return ClockEvents.findOne({ userId: Meteor.userId(), endTime: null });
    },
    sessionDuration() {
      const event = ClockEvents.findOne({ userId: Meteor.userId(), endTime: null });
      if (!event || !event.startTimestamp) return { duration: '0:00', format: 'mm:ss' };
      const now = currentTime.get();
      const elapsed = Math.floor((now - event.startTimestamp) / 1000);
      const prev = event.accumulatedTime || 0;
      return formatSessionDuration(prev + elapsed);
    },
    isSessionActive() {
      return !!ClockEvents.findOne({ userId: Meteor.userId(), endTime: null });
    },
    currentTeamSelected(teamId) {
      return selectedTeamId.get() === teamId;
    },
    optionAttrs(teamId) {
      const selected = selectedTeamId.get() === teamId;
      return { value: teamId, ...(selected ? { selected: true } : {}) };
    },
  });

  // Helper to close mobile menu
  const closeMobileMenu = () => {
    const menu = document.getElementById('mobileMenu');
    if (menu) {
      menu.classList.add('hidden');
    }
  };
  
  // Helper to open mobile menu
  const openMobileMenu = () => {
    const menu = document.getElementById('mobileMenu');
    if (menu) {
      menu.classList.remove('hidden');
    }
  };

  Template.mainLayout.events({
    // Mobile menu toggle
    'click #mobileMenuToggle'(event) {
      event.preventDefault();
      openMobileMenu();
    },
    
    // Close menu when clicking backdrop
    'click #mobileMenuBackdrop'(event) {
      event.preventDefault();
      closeMobileMenu();
    },
    
    // Handle nav clicks (both desktop and mobile)
    'click nav a'(event) {
      event.preventDefault();
      const href = event.currentTarget.getAttribute('href');
      const target = href.substring(1);
      
      // Close mobile menu if open
      closeMobileMenu();
      
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
    },
    async 'click #layoutClockBtn, click #layoutClockBtnMobile'(event) {
      event.preventDefault();
      const teamId = selectedTeamId.get();
      if (!teamId) {
        alert('Please select a team first.');
        return;
      }
      const active = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
      if (active) {
        const now = Date.now();
        const totalWorkTime = Math.floor((now - active.startTimestamp) / 1000);
        const t = Template.instance();
        t.clockOutTeamId = teamId;
        t.clockOutTotalWorkTime = totalWorkTime;
        const input = document.getElementById('layoutClockOutYoutubeLink');
        if (input) input.value = '';
        document.getElementById('layoutClockOutYoutubeModal')?.showModal();
      } else {
        const user = Meteor.user();
        const firstName = user?.profile?.firstName;
        const lastName = user?.profile?.lastName;
        if (!firstName || !lastName) {
          document.getElementById('layoutProfileNameModal')?.showModal();
          return;
        }
        const success = await sessionManager.startSession(teamId);
        if (success) {
          document.getElementById('layoutClockInSuccessModal')?.showModal();
        }
      }
    },
    async 'click #layoutClockOutYoutubeSubmit'(event, t) {
      event.preventDefault();
      const teamId = t.clockOutTeamId;
      const totalWorkTime = t.clockOutTotalWorkTime ?? 0;
      const input = document.getElementById('layoutClockOutYoutubeLink');
      const link = input?.value?.trim() || null;
      document.getElementById('layoutClockOutYoutubeModal')?.close();
      if (!teamId) return;
      const success = await sessionManager.stopSession(teamId, link);
      if (success) {
        const el = document.getElementById('layoutClockOutTime');
        if (el) el.textContent = formatTimeHoursMinutes(totalWorkTime);
        document.getElementById('layoutClockOutModal')?.showModal();
      }
    },
    async 'click #layoutClockOutYoutubeSkip'(event, t) {
      event.preventDefault();
      const teamId = t.clockOutTeamId;
      const totalWorkTime = t.clockOutTotalWorkTime ?? 0;
      document.getElementById('layoutClockOutYoutubeModal')?.close();
      if (!teamId) return;
      const success = await sessionManager.stopSession(teamId, null);
      if (success) {
        const el = document.getElementById('layoutClockOutTime');
        if (el) el.textContent = formatTimeHoursMinutes(totalWorkTime);
        document.getElementById('layoutClockOutModal')?.showModal();
      }
    },
    'submit #layoutProfileNameForm'(event) {
      event.preventDefault();
      const form = event.target;
      const firstName = (form.firstName?.value || '').trim();
      const lastName = (form.lastName?.value || '').trim();
      if (!firstName || !lastName) {
        alert('First name and last name are required.');
        return;
      }
      Meteor.call('updateUserProfile', { firstName, lastName }, (err) => {
        if (err) {
          alert('Failed to save profile: ' + (err.reason || err.message));
          return;
        }
        document.getElementById('layoutProfileNameModal')?.close();
        form.reset();
        const teamId = selectedTeamId.get();
        if (teamId) {
          sessionManager.startSession(teamId).then((success) => {
            if (success) {
              document.getElementById('layoutClockInSuccessModal')?.showModal();
            }
          });
        }
      });
    },
    'click #layoutClockInModalNewTicket'(event) {
      document.getElementById('layoutClockInSuccessModal')?.close();
      FlowRouter.go('/tickets');
      if (typeof Session !== 'undefined') {
        Session.set('openCreateTicketModal', true);
      }
    },
    'click #layoutClockInModalExistingTicket'(event) {
      document.getElementById('layoutClockInSuccessModal')?.close();
      FlowRouter.go('/tickets');
      if (typeof Session !== 'undefined') {
        Session.set('highlightExistingTickets', true);
      }
    },
    'change #teamSwitcherSelect'(event) {
      const teamId = event.target.value;
      if (teamId) {
        selectedTeamId.set(teamId);
        if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_TEAM_ID, teamId);
      }
    },
    'click [data-nav-href]'(event) {
      event.preventDefault();
      const href = event.currentTarget.getAttribute('data-nav-href');
      closeMobileMenu();
      if (href) FlowRouter.go(href);
    },
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