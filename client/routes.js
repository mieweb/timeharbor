import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ReactiveVar } from 'meteor/reactive-var';
import { currentScreen } from './components/auth/AuthPage.js';

export const currentRouteTemplate = new ReactiveVar(null);

// Authentication check function
const requireAuth = (context, redirect) => {
  if (!Meteor.userId()) {
    currentScreen.set('authPage');
    redirect('/');
  }
};

// Home route
FlowRouter.route('/', {
  name: 'home',
  action() {
    requireAuth(this, FlowRouter.go);
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('home');
  }
});

// Teams route
FlowRouter.route('/teams', {
  name: 'teams',
  action() {
    requireAuth(this, FlowRouter.go);
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('teams');
  }
});

// Tickets route
FlowRouter.route('/tickets', {
  name: 'tickets',
  action() {
    requireAuth(this, FlowRouter.go);
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('tickets');
  }
});

// Calendar route
FlowRouter.route('/calendar', {
  name: 'calendar',
  action() {
    requireAuth(this, FlowRouter.go);
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('calendar');
  }
});

// Admin route
FlowRouter.route('/admin', {
  name: 'admin',
  action() {
    requireAuth(this, FlowRouter.go);
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('admin');
  }
});

// Individual Timesheet route - NEW!
FlowRouter.route('/timesheet/:userId', {
  name: 'timesheet',
  action() {
    requireAuth(this, FlowRouter.go);
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('timesheet');
  }
});

// Member Activity route
FlowRouter.route('/member/:teamId/:userId', {
  name: 'memberActivity',
  action() {
    requireAuth(this, FlowRouter.go);
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('memberActivity');
  }
});

// User Guide route
FlowRouter.route('/guide', {
  name: 'guide',
  action() {
    requireAuth(this, FlowRouter.go);
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('userGuide');
  }
});

// 404 fallback
FlowRouter.route('*', {
  name: 'notFound',
  action() {
    requireAuth(this, FlowRouter.go);
    currentScreen.set('mainLayout');
    currentRouteTemplate.set('home');
  }
});

// Helper function for programmatic navigation
export const navigateToRoute = (routeName, params = {}) => {
  switch (routeName) {
    case 'home':
      FlowRouter.go('/');
      break;
    case 'teams':
      FlowRouter.go('/teams');
      break;
    case 'tickets':
      FlowRouter.go('/tickets');
      break;
    case 'calendar':
      FlowRouter.go('/calendar');
      break;
    case 'admin':
      FlowRouter.go('/admin');
      break;
    case 'timesheet':
      FlowRouter.go(`/timesheet/${params.userId}`);
      break;
    case 'memberActivity':
      FlowRouter.go(`/member/${params.teamId}/${params.userId}`);
      break;
    default:
      FlowRouter.go('/');
  }
};