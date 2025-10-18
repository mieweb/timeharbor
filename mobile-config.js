// Mobile configuration for Time Harbor iOS app
// Updated: iOS app development phase - ready for testing
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
