App.info({
  name: 'TimeHarbor',
  description: 'Your Personal Time Tracking Assistant',
  version: '1.0.0',
  author: 'TimeHarbor Team',
  email: 'support@timeharbor.com',
  website: 'https://timeharbor.com'
});

App.icons({
  // iOS
  'iphone': 'public/timeharbor-icon.svg',
  'iphone_2x': 'public/timeharbor-icon.svg',
  'iphone_3x': 'public/timeharbor-icon.svg',
  'ipad': 'public/timeharbor-icon.svg',
  'ipad_2x': 'public/timeharbor-icon.svg',
  
  // Android
  'android_ldpi': 'public/timeharbor-icon.svg',
  'android_mdpi': 'public/timeharbor-icon.svg',
  'android_hdpi': 'public/timeharbor-icon.svg',
  'android_xhdpi': 'public/timeharbor-icon.svg'
});

App.launchScreens({
  // iOS
  'iphone': 'public/timeharbor-icon.svg',
  'iphone_2x': 'public/timeharbor-icon.svg',
  'iphone5': 'public/timeharbor-icon.svg',
  'iphone6': 'public/timeharbor-icon.svg',
  'iphone6p_portrait': 'public/timeharbor-icon.svg',
  'iphone6p_landscape': 'public/timeharbor-icon.svg',
  'ipad_portrait': 'public/timeharbor-icon.svg',
  'ipad_portrait_2x': 'public/timeharbor-icon.svg',
  'ipad_landscape': 'public/timeharbor-icon.svg',
  'ipad_landscape_2x': 'public/timeharbor-icon.svg',
  
  // Android
  'android_ldpi_portrait': 'public/timeharbor-icon.svg',
  'android_ldpi_landscape': 'public/timeharbor-icon.svg',
  'android_mdpi_portrait': 'public/timeharbor-icon.svg',
  'android_mdpi_landscape': 'public/timeharbor-icon.svg',
  'android_hdpi_portrait': 'public/timeharbor-icon.svg',
  'android_hdpi_landscape': 'public/timeharbor-icon.svg',
  'android_xhdpi_portrait': 'public/timeharbor-icon.svg',
  'android_xhdpi_landscape': 'public/timeharbor-icon.svg'
});

// Set preferences
App.setPreference('StatusBarStyle', 'default');
App.setPreference('StatusBarBackgroundColor', '#ffffff');
App.setPreference('BackgroundColor', '#ffffff');

// Access rules for external URLs
App.accessRule('*');

// iOS specific settings
App.configurePlugin('phonegap-plugin-push', {
  SENDER_ID: 'YOUR_SENDER_ID' // Replace with your Firebase Cloud Messaging Sender ID if using push notifications
});


