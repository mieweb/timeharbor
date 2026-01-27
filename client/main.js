// Import HTML template first
import './main.html';

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

  // Check for saved theme preference or default to system preference
  const savedTheme = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  // Apply theme to html element (DaisyUI uses data-theme attribute)
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Listen for system theme changes if no manual preference is set
  if (!localStorage.getItem('theme')) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    });
  }
});