// TimeHarbor Mobile Configuration for Cordova
// This file configures the Cordova mobile app build settings

// Allow opening external URLs (e.g. ticket reference links) in system browser
App.accessRule('https://*', { type: 'intent' });
App.accessRule('http://*', { type: 'intent' });

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

// App Icon (generate sizes with: npm run generate-icons)
App.icons({
  'iphone': 'resources/icons/icon-60.png',
  'iphone_2x': 'resources/icons/icon-120.png',
  'iphone_3x': 'resources/icons/icon-180.png',
  'ipad': 'resources/icons/icon-76.png',
  'ipad_2x': 'resources/icons/icon-152.png',
  'android_ldpi': 'resources/icons/icon-36.png',
  'android_mdpi': 'resources/icons/icon-48.png',
  'android_hdpi': 'resources/icons/icon-72.png',
  'android_xhdpi': 'resources/icons/icon-96.png',
  'android_xxhdpi': 'resources/icons/icon-144.png',
  'android_xxxhdpi': 'resources/icons/icon-192.png'
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
