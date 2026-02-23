# TimeHarbor

**Privacy-First Time Tracking and Institutional Knowledge Sharing**

![TimeHarbor](https://img.shields.io/badge/Meteor-3.0+-blue?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-green?style=flat-square) ![Node](https://img.shields.io/badge/Node-18+-success?style=flat-square)

Meteor MongoDB Blaze Tailwind Firebase Real-Time Notifications

TimeHarbor is a comprehensive time tracking and institutional knowledge management platform designed specifically for teams, organizations, and communities that prioritize privacy and user empowerment. Unlike traditional employee monitoring solutions, TimeHarbor operates on the principle that **individuals own their time data** and control exactly what gets shared with whom.

**Watch the quick start video:** [https://youtube.com/shorts/uuosLqHDHRQ?feature=share](https://youtube.com/shorts/uuosLqHDHRQ?feature=share)

---

## Table of Contents

- [🎯 Purpose & Vision](#-purpose--vision)
- [🚀 Key Features](#-key-features)
- [🏢 Institutional Use Cases](#-institutional-use-cases)
- [📊 Core Concepts](#-core-concepts)
- [🔒 Privacy & Security](#-privacy--security)
- [💻 Technology Stack](#-technology-stack)
- [📁 Project Structure](#-project-structure)
- [⚙️ Installation & Setup](#️-installation--setup)
- [🛠️ Development](#️-development)
- [📝 Configuration](#-configuration)
- [🚀 Running the Application](#-running-the-application)
- [🧪 Testing](#-testing)
- [🔄 Real-Time Features](#-real-time-features)
- [📱 Mobile & Platform Support](#-mobile--platform-support)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👋 Contact](#-contact)

---

## 🎯 Purpose & Vision

TimeHarbor addresses critical needs in modern institutional knowledge management and accountability:

**Core Mission**
- Enable individuals to document, reflect on, and communicate the value of their time investment
- Provide transparent, consent-driven time tracking that respects privacy by default
- Facilitate institutional knowledge transfer and activity documentation
- Support team coordination and progress tracking without surveillance

**Why TimeHarbor Exists**
Traditional time tracking solutions treat individuals as subjects to be monitored. TimeHarbor inverts this model—your data belongs to you. You decide what gets recorded, how it's categorized, and who gets to see it. This philosophy makes TimeHarbor uniquely suited for organizations that trust their people and believe transparency should flow both ways.

**Institutional Problems Solved**
- **Knowledge Loss**: Capture institutional procedures and training materials before experts leave
- **Communication Gap**: Help team members advocate for themselves and their contributions
- **Privacy Concerns**: Time tracking that doesn't feel like surveillance
- **Accountability**: Transparent activity documentation with user consent
- **Team Coordination**: Real-time awareness of team activities and workloads
- **Grant Reporting**: Generate detailed time and activity reports for funding agencies

---

## 🚀 Key Features

### Time Tracking & Session Management
- **Clock In/Clock Out**: Simple, intuitive interface for starting and ending work sessions
- **Auto-Clock-Out**: Automatic safety feature prevents sessions from running indefinitely (10-hour limit with server-side backup)
- **Multiple Teams**: Join and track time across different teams simultaneously
- **Session Persistence**: All sessions are recorded and timestamped for historical analysis
- **Real-Time Updates**: Live session status across all connected devices

### Activity & Ticket Management
- **Tickets/Tasks**: Create detailed activity records tied to specific work items
- **Time Allocation**: Distribute session time across multiple tickets for granular tracking
- **Ticket Linking**: Reference external tickets with automatic title extraction via URL scraping
- **Session Breakdown**: View exactly how time was spent across different activities
- **Start/Stop Timers**: Individual timers for each ticket with pause/resume capability

### Team Collaboration
- **Team Creation**: Create teams and become the admin
- **Member Management**: Invite members, assign admin roles, manage permissions
- **Team Codes**: Share simple alphanumeric codes for team joining (no complex links needed)
- **Role-Based Access**: Admin-only operations for team configuration
- **Cross-Team Participation**: Users can belong to multiple teams independently

### Dashboard & Reporting
- **Home Dashboard**: Real-time view of all team sessions and member activity
- **Timesheet View**: Individual member activity breakdown with filtering
- **Time Analytics**: Aggregate time data by date range, team member, and ticket
- **Calendar Integration**: Visual calendar view of time entries and activities
- **Data Grid**: AG Grid integration for powerful data exploration and sorting
- **Custom Reports**: Generate filtered reports for specific time periods

### Notifications & Alerts
- **Push Notifications**: Real-time alerts for team events (clock in/out, session end)
- **Multiple Channels**: Web push, Firebase Cloud Messaging (FCM) for mobile
- **Smart Notifications**: Only notify relevant team admins of significant events
- **Notification Settings**: User control over notification preferences
- **Cross-Platform**: Notifications work across web, iOS, and Android

### Mobile & Responsive Design
- **Mobile-First UI**: Fully responsive design for all device sizes
- **Mobile App**: Cordova-based mobile application for iOS and Android
- **Offline Support**: Works with service workers for offline functionality
- **PWA Support**: Can be installed as a progressive web app
- **Native Controls**: Camera flash, zoom, stabilization for mobile devices

### Admin Dashboard
- **User Management**: View all users and their team assignments
- **Team Analytics**: Team-wide time and activity statistics
- **System Health**: Monitor application performance and active sessions
- **Advanced Filtering**: Deep analysis with custom date ranges and user filters

---

## 🏢 Institutional Use Cases

### FIRST Robotics & Educational Programs
Document team member contributions and generate sponsor reports showcasing organizational effort and impact. Track mentoring time, build sessions, and student participation for comprehensive activity records.

### Nonprofits & Community Organizations
Log volunteer hours for grant applications, board reporting, and impact assessment. Create detailed reports showing organizational capacity and volunteer contributions for funding bodies.

### Corporate Training & Onboarding
Capture standard operating procedures and training sessions as institutional knowledge. Track new employee onboarding progress and identify areas needing documentation.

### Research & Development Teams
Document time spent on different research phases, experiments, and administrative tasks. Generate reports for grant compliance and research impact assessment.

### Consulting & Professional Services
Track billable hours across clients and projects with detailed activity breakdown. Automatically allocate time to specific client deliverables and generate invoicing records.

### Educational Institutions
Students track time on coursework, group projects, and extracurriculars. Teachers monitor class-wide engagement and identify students needing support.

---

## 📊 Core Concepts

### Sessions (Clock Events)
A **session** represents a continuous period of tracked time. When you "clock in," you're starting a session. Sessions accumulate time continuously and contain one or more tickets.

**Session Lifecycle:**
- Clock In → Session starts with `startTimestamp`
- Add Tickets → Allocate session time to specific work items
- Pause/Resume → Can be paused within an active session
- Clock Out → Session ends with `endTime`, accumulating total time
- Auto-Stop → Automatic safety stop after 10 continuous hours

### Tickets (Activities)
**Tickets** are work items that exist within sessions. They represent specific, named pieces of work. Multiple tickets can be active within a single session, with time being allocated across them.

**Ticket Features:**
- Title and optional GitHub/external URL
- Time accumulation across multiple work sessions
- Session breakdown showing exactly when work occurred
- Linked to specific teams and creators

```javascript
// Ticket structure in database
{
  _id: ObjectId,
  teamId: String,
  title: String,           // "Implement login feature"
  github: String,          // Optional external link
  accumulatedTime: Number, // Total seconds spent
  createdBy: String,       // User ID
  createdAt: Date
}
```

### Teams
**Teams** are organizational units that group members and track collective activities.

**Team Features:**
- Unique alphanumeric code for easy member joining
- Admin role for team management
- Member list with role assignments
- Independent time tracking per team
- Shared activity visibility within team

```javascript
// Team structure
{
  _id: ObjectId,
  name: String,
  code: String,           // Unique join code
  members: [UserId],      // All team members
  admins: [UserId],       // Admin members
  createdAt: Date
}
```

### Clock Events
**Clock Events** form the core data structure linking sessions, time, and tickets. When you clock in, you create a clock event that tracks:

```javascript
// Clock Event structure
{
  _id: ObjectId,
  userId: String,
  teamId: String,
  startTimestamp: Number,    // Unix timestamp in milliseconds
  endTime: Date,             // Null if active
  accumulatedTime: Number,   // Total seconds in this session
  tickets: [                 // Array of tickets worked on
    {
      ticketId: String,
      startTimestamp: Number,
      accumulatedTime: Number,
      sessions: [            // Time blocks for this ticket
        {
          startTimestamp: Number,
          endTimestamp: Number
        }
      ]
    }
  ]
}
```

### User Roles
- **Individual User**: Primary role—tracks personal time, controls all data sharing
- **Team Member**: Part of a team, contributes to team activities
- **Team Admin**: Manages team settings, invites members, views all team data
- **System Admin**: Manages users and system-wide settings

---

## 🔒 Privacy & Security

### Privacy First Architecture
- **No Tracking by Default**: Nothing is tracked until explicitly clocked in
- **User-Controlled Sharing**: All team members implicitly see within-team activity only
- **Data Ownership**: Individual users retain full ownership of their time data
- **Explicit Consent**: No data harvesting or background collection

### Security Measures
- **Authentication**: Secure email/password accounts with Meteor's account system
- **Authorization**: Role-based access control (RBAC) on teams and admin functions
- **Session Management**: Automatic session expiration after 90 days of inactivity
- **Firebase Security**: FCM tokens secured with Firebase Admin SDK
- **VAPID Keys**: Web Push notifications secured with VAPID key pairs
- **HTTPS Only**: All communications encrypted in transit (production environment)
- **No Third-Party Tracking**: No analytics, no ads, no data selling

### Data Protection
- **Local Storage**: Password hashing with bcrypt via Meteor.js
- **Database**: MongoDB with authentication credentials
- **Backup**: Self-hosted with full control over data location
- **Compliance Ready**: Designed for GDPR and institutional data policies

### What TimeHarbor Does NOT Do
- ❌ Monitor keyboard or mouse activity
- ❌ Take screenshots or capture screen content
- ❌ Track location or device movements
- ❌ Sell data to third parties
- ❌ Use data for targeted advertising
- ❌ Share information without explicit user action
- ❌ Enable "always-on" activity tracking

---

## 💻 Technology Stack

### Backend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Meteor.js | Full-stack JavaScript framework with real-time data sync |
| **Database** | MongoDB | Document database for flexible data modeling |
| **Real-Time** | Meteor DDP | Automatic synchronization between server and clients |
| **Authentication** | Meteor Accounts | Built-in user account management |
| **API** | Meteor Methods | Server-side RPC methods for client calls |
| **Notifications** | Firebase Admin SDK | FCM for mobile push notifications |
| **Web Push** | web-push npm | Web Push API for desktop notifications |

### Frontend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Templating** | Blaze (Meteor) | Reactive templates with two-way binding |
| **CSS Framework** | Tailwind CSS | Utility-first CSS for rapid UI development |
| **UI Components** | DaisyUI | Pre-built Tailwind component library |
| **Data Grid** | AG Grid Community | Powerful, performance-optimized data tables |
| **Routing** | FlowRouter Extra | Client-side routing with reactive URL management |
| **HTTP Client** | Axios | Promise-based HTTP requests |
| **DOM Parsing** | Cheerio | Extract data from HTML (server-side) |
| **Dark Mode** | Native CSS | System preference detection and toggles |

### Mobile & Deployment
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Mobile Build** | Cordova | Cross-platform mobile app wrapper |
| **iOS** | Xcode, Swift | Native iOS development integration |
| **Android** | Android Studio | Native Android development integration |
| **Push Notifications** | FCM + APNS | Firebase Cloud Messaging for Android, APNs for iOS |
| **PWA** | Service Workers | Offline capability and install prompt |

### Development & DevOps
| Tool | Purpose |
|------|---------|
| **Node.js 18+** | Runtime environment |
| **npm** | Package management |
| **Babel** | JavaScript transpilation |
| **PostCSS** | CSS processing and optimization |
| **Autoprefixer** | CSS vendor prefixing |
| **Mocha + Meteortesting** | Testing framework |

---

## 📁 Project Structure

```
timeharbor/
├── client/                         # Frontend application
│   ├── main.js                    # Client entry point
│   ├── main.html                  # Root HTML template
│   ├── main.css                   # Global styles
│   ├── routes.js                  # Client-side routing configuration
│   │
│   ├── components/                # Reusable UI components
│   │   ├── auth/                  # Authentication pages
│   │   │   ├── AuthPage.html     # Login/signup UI
│   │   │   └── AuthPage.js       # Auth logic and handlers
│   │   │
│   │   ├── layout/                # Main application layout
│   │   │   ├── MainLayout.html   # Navigation and layout shell
│   │   │   └── MainLayout.js     # Layout state management
│   │   │
│   │   ├── home/                  # Dashboard
│   │   │   ├── HomePage.html     # Team activity view with AG Grid
│   │   │   └── HomePage.js       # Session and activity logic
│   │   │
│   │   ├── teams/                 # Team management
│   │   │   ├── TeamsPage.html    # Team creation/joining UI
│   │   │   └── TeamsPage.js      # Team CRUD operations
│   │   │
│   │   ├── tickets/               # Activity tracking
│   │   │   ├── TicketsPage.html  # Ticket creation and timers
│   │   │   └── TicketsPage.js    # Ticket timer and allocation logic
│   │   │
│   │   ├── timesheet/             # Individual time summaries
│   │   │   ├── TimesheetPage.html # Time summaries and analytics
│   │   │   └── TimesheetPage.js  # Time calculations and filters
│   │   │
│   │   ├── calendar/              # Calendar view
│   │   │   ├── CalendarPage.html # Calendar representation
│   │   │   └── CalendarPage.js   # Date-based filtering
│   │   │
│   │   ├── admin/                 # Admin dashboard
│   │   │   ├── admin.html        # Admin overview
│   │   │   └── admin.js          # Admin functions
│   │   │
│   │   ├── member/                # Member activity detail
│   │   │   ├── MemberActivityPage.html
│   │   │   └── MemberActivityPage.js
│   │   │
│   │   ├── notifications/         # Notification preferences
│   │   │   ├── NotificationSettings.html
│   │   │   └── NotificationSettings.js
│   │   │
│   │   ├── guide/                 # User guide/help
│   │   │   ├── UserGuide.html
│   │   │   └── UserGuide.js
│   │   │
│   │   └── [component]/
│   │       ├── [component].html   # Template markup
│   │       └── [component].js     # Logic and helpers
│   │
│   └── utils/                     # Client-side utilities
│       ├── DateUtils.js          # Date/time formatting and calculations
│       ├── TimeUtils.js          # Duration formatting (H:MM:SS, etc.)
│       ├── UrlUtils.js           # URL manipulation and external link handling
│       ├── NotificationUtils.js  # Push notification registration
│       └── UserTeamUtils.js      # User/team relationship queries
│
├── server/                        # Backend application
│   ├── main.js                   # Server entry point and startup
│   │
│   ├── methods/                  # Server-side RPC methods
│   │   ├── auth.js              # User creation and auth methods
│   │   ├── teams.js             # Team CRUD and membership operations
│   │   ├── tickets.js           # Activity/ticket operations
│   │   ├── clockEvents.js       # Clock in/out and session logic
│   │   ├── calendar.js          # Calendar-specific queries
│   │   └── notifications.js     # Notification preference management
│   │
│   └── utils/                   # Server-side utilities
│       ├── ClockEventHelpers.js # Session time calculations
│       ├── pushNotifications.js # Firebase and web-push integration
│       └── userHelpers.js       # User profile and display utilities
│
├── public/                      # Static assets
│   ├── sw.js                   # Service worker for offline support
│   └── timeharbor-icon-generator.html  # Icon generation utility
│
├── tests/                       # Test suite
│   └── main.js                 # Mocha/Meteortesting configuration
│
├── collections.js              # Shared data models (client + server)
│   ├── Tickets
│   ├── Teams
│   ├── Sessions
│   └── ClockEvents
│
├── Configuration Files
│   ├── package.json             # Dependencies and npm scripts
│   ├── mobile-config.js         # Cordova mobile app configuration
│   ├── settings.json            # Firebase and VAPID credentials
│   ├── tailwind.config.js       # Tailwind CSS customization
│   ├── postcss.config.mjs       # PostCSS pipeline configuration
│   └── .meteor/                 # Meteor framework configuration
│
├── Firebase Configuration
│   ├── GoogleService-Info.plist # iOS Firebase configuration
│   └── google-services.json     # Android Firebase configuration
│
└── Documentation
    ├── README.md                # This file
    ├── USAGE.md                 # Quick start guide
    └── .gitignore               # Git configuration
```

---

## ⚙️ Installation & Setup

### Prerequisites

**Required**
- **Node.js 18+** ([Download](https://nodejs.org/))
- **Meteor Framework** (Install via: `npm install -g meteor`)
- **MongoDB** (Included with Meteor development environment)

**For Mobile Development**
- **Xcode 13+** (for iOS - macOS only)
- **Android Studio 2021+** (for Android)
- **CocoaPods** (for iOS dependencies: `sudo gem install cocoapods`)

**For IDE/Editor**
- Visual Studio Code (recommended)
- Git for version control

### Step 1: Clone the Repository

```bash
git clone https://github.com/mieweb/timeharbor.git
cd timeharbor
```

### Step 2: Install Dependencies

```bash
# Install npm dependencies
meteor npm install

# For iOS development, install CocoaPods dependencies
cd ios && pod install && cd ..
```

### Step 3: Configure Firebase & Notifications

Copy your Firebase configuration into the project:

```bash
# Firebase configurations for mobile
cp /path/to/GoogleService-Info.plist ./
cp /path/to/google-services.json ./

# Or configure settings.json with your Firebase credentials
# (See Configuration section below)
```

### Step 4: Environment Configuration

Create or update `settings.json` in the project root:

```json
{
  "public": {
    "vapidPublicKey": "YOUR_VAPID_PUBLIC_KEY",
    "fcmSenderId": "YOUR_FCM_SENDER_ID"
  },
  "private": {
    "VAPID_PRIVATE_KEY": "YOUR_VAPID_PRIVATE_KEY",
    "VAPID_PUBLIC_KEY": "YOUR_VAPID_PUBLIC_KEY",
    "project_id": "YOUR_FIREBASE_PROJECT_ID",
    "private_key": "YOUR_FIREBASE_PRIVATE_KEY",
    "client_email": "YOUR_FIREBASE_CLIENT_EMAIL",
    "github": {
      "clientId": "YOUR_GITHUB_OAUTH_CLIENT_ID",
      "clientSecret": "YOUR_GITHUB_OAUTH_CLIENT_SECRET"
    }
  }
}
```

#### GitHub OAuth Setup

1. Go to [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers) and create a new OAuth App.
2. Set the **Authorization callback URL** to `http://localhost:3000/api/github/callback` (or your production URL).
3. Copy the **Client ID** and **Client Secret** into `settings.json` under `private.github`.

---

## 🛠️ Development

### Starting the Development Server

```bash
# Standard development (web only)
meteor

# With settings
meteor --settings settings.json

# Verbose output for debugging
meteor --verbose

# Specific port
meteor --port 3000
```

The application will be available at `http://localhost:3000`

### Running Tests

```bash
# Run tests once
npm run test

# Run tests in watch mode (auto-rerun on changes)
npm run test-app

# Run specific test file (create test files in tests/)
npm run test -- --grep "description"
```

### Building for Production

```bash
# Standard production build
meteor build --directory --server https://yourdomain.com

# With visualization of bundle size
npm run visualize
```

### Code Organization Best Practices

**Client Code**
- Place UI components in `client/components/[feature]/`
- Keep utilities in `client/utils/`
- Use Blaze templates for reactive UI
- Leverage ReactiveVar for component state

**Server Code**
- Group related methods in `server/methods/[domain].js`
- Place shared utilities in `server/utils/`
- Use async/await for database operations
- Validate all user input with `check()`

**Shared Code**
- Define collections in `collections.js`
- Both client and server can import from here
- Keep collection definitions simple

---

## 📝 Configuration

### Firebase Cloud Messaging (FCM)

**For Android notifications:**

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Generate Android credentials and download `google-services.json`
3. Place in project root
4. Add credentials to `settings.json`:

```json
{
  "private": {
    "project_id": "your-project-id",
    "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
    "client_email": "firebase-adminsdk@your-project.iam.gserviceaccount.com"
  }
}
```

### Web Push Notifications

**For web (desktop/browser) notifications:**

1. Generate VAPID key pair:

```bash
# Using web-push CLI
npx web-push generate-vapid-keys
```

2. Add to `settings.json`:

```json
{
  "public": {
    "vapidPublicKey": "PUBLIC_KEY_HERE"
  },
  "private": {
    "VAPID_PRIVATE_KEY": "PRIVATE_KEY_HERE",
    "VAPID_PUBLIC_KEY": "PUBLIC_KEY_HERE"
  }
}
```

### Tailwind CSS Customization

Edit `tailwind.config.js` to customize theme:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#006bff',
        // Add custom colors
      }
    }
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark']
  }
}
```

### Mobile Configuration

Edit `mobile-config.js` to configure Cordova app:

```javascript
App.info({
  name: 'TimeHarbor',
  description: '...',
  version: '1.0.0',
  author: 'Your Name'
});

// iOS minimum version
App.setPreference('deployment-target', '13.0', 'ios');

// Add custom permissions
App.setPermission('CAMERA', 'android');
```

---

## 🚀 Running the Application

### Web Application

```bash
# Development with hot reload
meteor

# Production mode
meteor --production

# Custom settings
meteor --settings settings.json
```

**Access at:** `http://localhost:3000`

### Mobile Application (iOS)

```bash
# Prebuild and prepare native project
npx expo prebuild --platform ios

# Open and run in Xcode
cd ios
pod install
open pulse.xcworkspace

# Or build and run directly
npx expo run:ios

# Build for App Store
eas build --platform ios --profile production
```

### Mobile Application (Android)

```bash
# Build and run on Android
npx expo run:android

# Build for Google Play
eas build --platform android --profile production

# Emulator
npx expo run:android --emulator
```

---

## 🧪 Testing

### Test Structure

Create test files in the `tests/` directory:

```javascript
// tests/clock-events.tests.js
import { Meteor } from 'meteor/meteor';
import { describe, it, expect } from 'meteor/meteortesting:mocha';
import { ClockEvents } from '../collections.js';

describe('Clock Events', () => {
  it('should create a new clock event', () => {
    const id = ClockEvents.insert({ userId: 'test' });
    expect(id).to.exist;
  });
});
```

### Running Tests

```bash
# Run all tests once
npm run test

# Watch mode with auto-rerun
npm run test-app

# Run with specific grep pattern
npm run test -- --grep "Clock"
```

---

## 🔄 Real-Time Features

### Meteor DDP (Distributed Data Protocol)

TimeHarbor uses Meteor's real-time synchronization for:

- **Live Session Updates**: Clock in/out events broadcast to team members
- **Automatic UI Updates**: Templates reactively update when data changes
- **Subscription System**: Efficient data streaming to connected clients
- **Method Calls**: Secure RPC calls to server with validation

### Example: Real-Time Clock Event

```javascript
// Server publishes active sessions
Meteor.publish('activeClockEvents', function(teamId) {
  return ClockEvents.find({ teamId, endTime: null });
});

// Client subscribes and auto-updates
this.subscribe('activeClockEvents', teamId);

// Data automatically syncs via DDP
const active = ClockEvents.find({ teamId, endTime: null });
```

### Push Notifications

**Integration Points**
- Team member clocks in → Admins notified
- Long session detected → User warned and auto-clocked out
- System alerts → Can be configured per user

**Implementation**
- **Web Push**: Uses VAPID keys and browser notifications API
- **FCM**: Firebase Cloud Messaging for mobile devices
- **Graceful Degradation**: App works fine if notifications fail

---

## 📱 Mobile & Platform Support

### Responsive Design

TimeHarbor uses Tailwind CSS for mobile-first responsive design:

- **Mobile**: 320px+ (phones)
- **Tablet**: 768px+ (iPad, Android tablets)
- **Desktop**: 1024px+ (laptops, desktops)

### Mobile App (Cordova)

Features:
- ✅ Offline support via Service Workers
- ✅ Push notifications (FCM/APNS)
- ✅ Camera access for profile photos
- ✅ Native storage for fast load times
- ✅ Permission handling for iOS/Android

**Build Variants**
- Debug: `cordova prepare` → local testing
- Release: Signed APK/IPA for stores

### Progressive Web App (PWA)

```javascript
// Service worker automatically caches assets
// Install prompt appears when criteria met
// Works offline with cached data
```

Users can:
- Add to home screen (iOS/Android)
- Install on desktop (Windows/macOS)
- Use offline with last synced data

---

## 🤝 Contributing

We welcome contributions! Here's how to get involved:

### Development Workflow

1. **Fork the repository**

```bash
git clone https://github.com/mieweb/timeharbor.git
cd timeharbor
```

2. **Create a feature branch**

```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**

```bash
# Ensure code follows conventions
# Write tests for new features
# Update documentation as needed
```

4. **Test locally**

```bash
npm run test
npm run lint
meteor --settings settings.json
```

5. **Commit with clear messages**

```bash
git commit -m 'feat: add amazing feature' -m 'Detailed explanation of changes'
```

6. **Push to your branch**

```bash
git push origin feature/amazing-feature
```

7. **Open a Pull Request**

Include:
- Clear description of changes
- Link to related issues
- Testing notes
- Screenshots for UI changes

### Code Standards

- **JavaScript**: Follow Meteor best practices
- **Naming**: camelCase for variables, PascalCase for components
- **Comments**: Use JSDoc for public functions
- **Testing**: Aim for 80%+ coverage on business logic
- **Performance**: Avoid N+1 queries, optimize subscriptions

### Reporting Issues

**Bug Reports**
- Clear reproduction steps
- Expected vs. actual behavior
- Environment (OS, browser, Meteor version)
- Error logs and stack traces

**Feature Requests**
- Clear use case and problem statement
- Suggested implementation approach
- Any alternative solutions considered

---

## 📄 License

TimeHarbor is licensed under the **MIT License**.

See [LICENSE](LICENSE) file for full details.

**Summary:**
- ✅ Free for personal and commercial use
- ✅ Modify and distribute
- ✅ Include original license and copyright

---

## 👋 Contact & Support

### Get Help

- **GitHub Issues**: [Report bugs](https://github.com/mieweb/timeharbor/issues) or [request features](https://github.com/mieweb/timeharbor/discussions)
- **Email**: support@mieweb.com
- **Community**: Join discussions in GitHub Discussions tab

### Project Information

- **Repository**: [github.com/mieweb/timeharbor](https://github.com/mieweb/timeharbor)
- **Organization**: Medical Informatics Engineering, Inc.
- **Website**: [mieweb.com](https://mieweb.com)
- **Quick Start**: [Watch the video](https://youtube.com/shorts/uuosLqHDHRQ?feature=share)

### Related Resources

- **Meteor Documentation**: [docs.meteor.com](https://docs.meteor.com)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com)
- **AG Grid**: [ag-grid.com](https://ag-grid.com)
- **Firebase**: [firebase.google.com](https://firebase.google.com)

---

**Made with ❤️ for transparent, privacy-first time tracking and institutional knowledge sharing**
