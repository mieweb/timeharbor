// Mobile configuration for Time Harbor iOS app
// Updated: iOS app development phase - ready for testing

// Configure Google OAuth plugin
App.configurePlugin('cordova-plugin-googleplus', {
  REVERSED_CLIENT_ID: 'com.googleusercontent.apps.1066114802277-u08im0ff2jqqlns77ve8bkkjn8t05om2',
  GOOGLE_CLIENT_ID: '1066114802277-u08im0ff2jqqlns77ve8bkkjn8t05om2.apps.googleusercontent.com'
});

App.configurePlugin('phonegap-plugin-push', {
  SENDER_ID: 'YOUR_FIREBASE_SENDER_ID' // Will be replaced with actual Firebase Sender ID
});

// Configure iOS-specific settings
App.info({
  name: 'Time Harbor',
  description: 'Time tracking and project management for teams',
  version: '1.0.0',
  author: 'Time Harbor Team',
  email: 'admin@timeharbor.com',
  website: 'https://timeharbor.com'
});

// iOS-specific configuration
App.configurePlugin('phonegap-plugin-push', {
  SENDER_ID: 'YOUR_FIREBASE_SENDER_ID'
});

// Configure app icons and splash screens
App.icons({
  'iphone': 'public/timeharbor-icon.svg',
  'iphone_2x': 'public/timeharbor-icon.svg',
  'iphone_3x': 'public/timeharbor-icon.svg',
  'ipad': 'public/timeharbor-icon.svg',
  'ipad_2x': 'public/timeharbor-icon.svg'
});

App.launchScreens({
  'iphone': 'public/timeharbor-icon.svg',
  'iphone_2x': 'public/timeharbor-icon.svg',
  'iphone_3x': 'public/timeharbor-icon.svg',
  'ipad': 'public/timeharbor-icon.svg',
  'ipad_2x': 'public/timeharbor-icon.svg'
});

// Configure iOS permissions
App.accessRule('*');
App.accessRule('https://timeharbor.com/*');
App.accessRule('https://*.googleapis.com/*');
App.accessRule('https://*.firebase.com/*');
