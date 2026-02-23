// Import HTML template first
import './main.html';

// Import shared partials (must load before components that use them)
import './components/shared/icons.html';

// Import component HTML files
import './components/auth/AuthPage.html';
import './components/layout/MainLayout.html';
import './components/teams/TeamsPage.html';
import './components/tickets/TicketsPage.html';
import './components/home/HomePage.html';
import './components/calendar/CalendarPage.html';
import './components/admin/admin.html';
import './components/timesheet/TimesheetPage.html';
import './components/member/MemberActivityPage.html';
import './components/guide/UserGuide.html';
import './components/notifications/NotificationInboxPage.html';
import './components/profile/ProfilePage.html';

// Import component JS files
import './components/auth/AuthPage.js';
import './components/layout/MainLayout.js';
import './components/teams/TeamsPage.js';
import './components/tickets/TicketsPage.js';
import './components/home/HomePage.js';
import './components/calendar/CalendarPage.js';
import './components/admin/admin.js';
import './components/timesheet/TimesheetPage.js';
import './components/member/MemberActivityPage.js';
import './components/guide/UserGuide.js';
import './components/notifications/NotificationInboxPage.js';
import './components/profile/ProfilePage.js';

// Import routing configuration
import './routes.js';

// Import utilities
import './utils/DateUtils.js';
import { initializeNotifications } from './utils/NotificationUtils.js';

// Initialize dark mode theme
Meteor.startup(() => {
  // Initialize push notifications
  initializeNotifications().catch(err => {
    console.error('[Startup] Failed to initialize notifications:', err);
  });

  // Check for saved theme preference or default to light
  const savedTheme = localStorage.getItem('theme') || 'light';

  // Apply theme to html element (DaisyUI uses data-theme attribute)
  document.documentElement.setAttribute('data-theme', savedTheme);
});