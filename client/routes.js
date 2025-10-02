import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

// Import the current screen management for gradual migration
import { currentScreen } from './components/auth/AuthPage.js';

// Create a reactive var to store the current route template
import { ReactiveVar } from 'meteor/reactive-var';
export const currentRouteTemplate = new ReactiveVar(null);

/**
 * GRADUAL MIGRATION PLAN:
 * ✅ Phase 1: Home route (/) - COMPLETED
 * 🔄 Phase 2: Teams route (/teams) - NEXT
 * ⏳ Phase 3: Tickets, Calendar, Admin routes
 */

// Note: ostrio:flow-router-extra doesn't use FlowRouter.configure()
// Configuration is handled differently in this package

// =============================================================================
// PHASE 1: HOME PAGE ROUTE ONLY
// =============================================================================

/**
 * Home page route - Root path
 * This replaces the manual template switching for home page only
 */
FlowRouter.route('/', {
  name: 'home',
  action(params, queryParams) {
    // Check authentication first
    if (!Meteor.userId()) {
      // User not logged in - redirect to auth page
      currentScreen.set('authPage');
      return;
    }
    
    // User is logged in - show main layout with home template
    currentScreen.set('mainLayout');
    // Set the template for Flow Router managed routes
    currentRouteTemplate.set('home');
  }
});

// =============================================================================
// FALLBACK FOR NON-MIGRATED ROUTES
// =============================================================================

/**
 * Temporary fallback for routes not yet migrated
 * This ensures existing navigation still works during gradual migration
 */
FlowRouter.route('*', {
  name: 'notFound',
  action() {
    // For now, if route not found, check if user is logged in
    if (!Meteor.userId()) {
      currentScreen.set('authPage');
    } else {
      // Default to home page for unknown routes during migration
      currentScreen.set('mainLayout');
      currentRouteTemplate.set('home');
    }
  }
});

// =============================================================================
// UTILITY FUNCTIONS FOR GRADUAL MIGRATION
// =============================================================================

/**
 * Helper function to check if current route is handled by Flow Router
 * This helps during the gradual migration process
 */
export const isRouteHandledByFlowRouter = () => {
  const currentRoute = FlowRouter.getRouteName();
  return currentRoute === 'home';
};

/**
 * Helper function to navigate programmatically
 * Use this instead of setting currentTemplate directly for migrated routes
 */
export const navigateToRoute = (routeName, params = {}) => {
  if (routeName === 'home') {
    FlowRouter.go('/', params);
  } else {
    // For non-migrated routes, fall back to old system
    console.log(`Route '${routeName}' not yet migrated to Flow Router`);
    return false;
  }
  return true;
};

console.log('✅ Flow Router configured - Phase 1: Home page route only');
