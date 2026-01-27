// TimeHarbor Mobile Configuration for Cordova
// This file configures the Cordova mobile app build settings

// App Metadata
App.info({
  id: 'com.mieweb.timeharbor',
  name: 'TimeHarbor',
  description: 'A privacy-first time tracking and reflection tool that empowers individuals to track, reflect on, and selectively share how they spend their time.',
  author: 'MIE Web',
  email: 'support@mieweb.com',
  website: 'https://github.com/mieweb/timeharbor',
  version: '1.0.0'
});

// iOS Configuration
App.setPreference('deployment-target', '13.0', 'ios'); // Bump to 13.0 for better support
App.setPreference('SwiftVersion', '5.0', 'ios');

// Push Notifications (Firebase)
App.configurePlugin('cordova-plugin-firebase-messaging', {
  ANDROID_FIREBASE_BOM_VERSION: '32.0.0'
});

// Resource Files (FCM Configuration)
// Paths are relative to the project root
App.addResourceFile('google-services.json', 'app/google-services.json', 'android');
App.addResourceFile('GoogleService-Info.plist', 'GoogleService-Info.plist', 'ios');
