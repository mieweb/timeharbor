import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ReactiveVar } from 'meteor/reactive-var';
import { currentScreen } from './components/auth/AuthPage.js';

// Current route template for dynamic rendering
export const currentRouteTemplate = new ReactiveVar(null);

// Application Routes
FlowRouter.route('/', {
  name: 'home',
  action() {
    if (!Meteor.userId()) {
      currentScreen.set('authPage');
      return;
    }
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('home');
  }
});

FlowRouter.route('/teams', {
  name: 'teams',
  action() {
    if (!Meteor.userId()) {
      currentScreen.set('authPage');
      return;
    }
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('teams');
  }
});

FlowRouter.route('/tickets', {
  name: 'tickets',
  action() {
    if (!Meteor.userId()) {
      currentScreen.set('authPage');
      return;
    }
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('tickets');
  }
});

FlowRouter.route('/calendar', {
  name: 'calendar',
  action() {
    if (!Meteor.userId()) {
      currentScreen.set('authPage');
      return;
    }
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('calendar');
  }
});

FlowRouter.route('/admin', {
  name: 'admin',
  action() {
    if (!Meteor.userId()) {
      currentScreen.set('authPage');
      return;
    }
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('admin');
  }
});

FlowRouter.route('/settings', {
  name: 'settings',
  action() {
    if (!Meteor.userId()) {
      currentScreen.set('authPage');
      return;
    }
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('settings');
  }
});

// Fallback route for unknown paths
FlowRouter.route('*', {
  name: 'notFound',
  action() {
    if (!Meteor.userId()) {
      currentScreen.set('authPage');
    } else {
      currentScreen.set('mainLayout');
      currentRouteTemplate.set('home');
    }
  }
});

// Utility function for programmatic navigation
export const navigateToRoute = (routeName, params = {}) => {
  const routes = {
    home: '/',
    teams: '/teams',
    tickets: '/tickets',
    calendar: '/calendar',
    admin: '/admin',
    settings: '/settings'
  };
  
  if (routes[routeName]) {
    FlowRouter.go(routes[routeName], params);
    return true;
  }
  return false;
};
