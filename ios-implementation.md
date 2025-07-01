# iOS App Implementation

This document describes the iOS app implementation for TimeHarbor.

## Features Implemented

### 1. iOS Platform Support
- Added `ios` platform to `.meteor/platforms`
- Configured mobile-config.js with app metadata, icons, and splash screens
- Added Cordova mobile packages for iOS support

### 2. Push Notifications
- Integrated `push` and `raix:push` packages for push notification support
- Configured APNs (Apple Push Notification service) settings
- Implemented server-side notification sending infrastructure
- Added notification preferences collection and management

### 3. Time Logging with Notifications
- Enhanced existing time tracking methods to send notifications
- Notifications are sent when users start/stop time logging on activities
- Team members receive notifications for activity updates in projects they follow

### 4. Notification Preferences UI
- Created comprehensive notification settings page (`/notifications`)
- Users can enable/disable notifications
- Project-specific notification subscriptions
- Event type filtering (time logging, project updates, new activities)
- Mobile-responsive design with touch-friendly controls

### 5. Mobile UI Enhancements
- Added mobile-specific CSS optimizations
- Improved touch targets for mobile devices
- Responsive design for various screen sizes
- iOS safe area support for modern devices

### 6. GitHub Actions CI/CD
- Created automated iOS build workflow
- Generates downloadable IPA files for testing
- Supports code signing configuration
- Includes build artifact uploads

## Technical Implementation

### Collections
- **NotificationPreferences**: Stores user notification settings
  - `userId`: User identifier
  - `projectNotifications`: Array of project IDs to follow
  - `eventTypes`: Array of notification types to receive
  - `enabled`: Global notification toggle

### Server Methods
- `updateNotificationPreferences(preferences)`: Update user notification settings
- `subscribeToProjectNotifications(teamId, eventTypes)`: Subscribe to project notifications
- `sendNotification(userId, title, message, data)`: Send push notification to user

### Client Components
- **notificationSettings**: Full-featured settings management interface
- Navigation integration with main app header
- Reactive UI updates based on preference changes

### Mobile Configuration
- App ID: `com.mieweb.timeharbor`
- Target iOS version: 12.0+
- Universal device support (iPhone + iPad)
- Configured for development and production builds

## Setup Instructions

### Prerequisites
1. Xcode installed (for iOS builds)
2. Apple Developer account (for production)
3. APNs certificates configured

### Development Setup
1. Add iOS platform: `meteor add-platform ios`
2. Install dependencies: `meteor npm install`
3. Run with iOS: `meteor run ios`

### Production Build
1. Configure APNs certificates in environment variables:
   - `APN_PASSPHRASE`: Certificate passphrase
   - `APN_KEY`: Path to APNs key file
   - `APN_CERT`: Path to APNs certificate file
2. Build: `meteor build --server=https://your-server.com`
3. Use GitHub Actions workflow for automated builds

## Testing

### Manual Testing
1. Create user account and join/create projects
2. Navigate to `/notifications` to configure preferences
3. Enable notifications and select projects/event types
4. Test time logging to trigger notifications
5. Verify notifications appear on subscribed devices

### Automated Testing
- Added test coverage for NotificationPreferences collection
- Tests for CRUD operations and data integrity
- Run tests: `meteor test --driver-package meteortesting:mocha`

## Extensibility

The notification system is designed for easy expansion:

### Adding New Event Types
1. Add new event type to notification preferences UI
2. Implement notification sending in relevant server methods
3. Update event type validation and handling

### Supporting More Platforms
- Android support can be added by including `android` platform
- Cross-platform notification handling already implemented
- UI components are responsive and touch-friendly

### Advanced Notification Features
- Rich notifications with actions
- Notification scheduling
- User-to-user direct notifications
- Integration with external notification services

## Known Limitations

1. **Icons and Splash Screens**: Placeholder structure created, actual assets needed
2. **APNs Certificates**: Must be configured for production use
3. **Push Service**: Currently uses raix:push, may need updates for newer iOS versions
4. **Testing**: Physical device testing required for full push notification validation

## Future Enhancements

1. Rich push notifications with images and actions
2. Background notification processing
3. Notification analytics and delivery tracking
4. Advanced notification scheduling
5. Integration with iOS Focus modes and notification categories