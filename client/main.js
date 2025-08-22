//import { Template } from 'meteor/templating';
//import { ReactiveVar } from 'meteor/reactive-var';
//import { Teams, Tickets, ClockEvents } from '../collections.js';

// Import HTML template first
import './main.html';

// Import component HTML files
import './components/auth/AuthPage.html';
import './components/layout/MainLayout.html';
import './components/teams/TeamsPage.html';
import './components/tickets/TicketsPage.html';
import './components/home/HomePage.html';
import './components/grid/TimeGrid.html';

// Import component JS files
import './components/auth/AuthPage.js';
import './components/layout/MainLayout.js';
import './components/teams/TeamsPage.js';
import './components/tickets/TicketsPage.js';
import './components/home/HomePage.js';
import './components/grid/TimeGrid.js';

// Import currentTime from MainLayout

//import { currentTime } from './components/layout/MainLayout.js';