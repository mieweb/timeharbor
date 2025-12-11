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

// Configure Cordova Push Plugin for FCM (havesource fork)
App.configurePlugin('cordova-plugin-push', {
  'SENDER_ID': '991518210130', // FCM Sender ID from settings.json
  'ANDROID_SUPPORT_V13_VERSION': '28.0.0'
});

// Add access rules for FCM
App.accessRule('https://fcm.googleapis.com/*');
App.accessRule('https://*.googleapis.com/*');

// Copy google-services.json to Android app directory for FCM
App.appendToConfig(`
  <platform name="android">
    <resource-file src="../../../../google-services.json" target="app/google-services.json" />
  </platform>
`);
