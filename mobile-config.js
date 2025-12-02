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

App.configurePlugin('cordova-plugin-googleplus', {
  'REVERSED_CLIENT_ID': 'com.googleusercontent.apps.1066114802277-lbmfo234a8ps9ia6bpc0novu10k8h815',
  'WEB_APPLICATION_CLIENT_ID': '1066114802277-u08im0ff2jqqlns77ve8bkkjn8t05om2.apps.googleusercontent.com',
  'ANDROID_CLIENT_ID': '1066114802277-61ghemd02b00fkgg01m9siv9pvqa7ans.apps.googleusercontent.com',
  'IOS_CLIENT_ID': '1066114802277-lbmfo234a8ps9ia6bpc0novu10k8h815.apps.googleusercontent.com'
});

// Push Notification Plugin Configuration
App.configurePlugin('phonegap-plugin-push', {
  SENDER_ID: '991518210130' // Replace with your FCM Sender ID from Firebase Console
});

// Android permissions
App.accessRule('https://*');
App.accessRule('http://*');
App.accessRule('*');

// App icons
// Note: Android requires PNG files, not SVG. iOS can use SVG.
// For now, Android will use default icons. To add custom icons:
// 1. Convert timeharbor-icon.svg to PNG files in different sizes
// 2. Place them in public/ folder
// 3. Update the paths below to point to the PNG files
App.icons({
  'iphone': 'public/timeharbor-icon.svg',
  'iphone_2x': 'public/timeharbor-icon.svg',
  'iphone_3x': 'public/timeharbor-icon.svg',
  'ipad': 'public/timeharbor-icon.svg',
  'ipad_2x': 'public/timeharbor-icon.svg'
  // Android icons removed - Android requires PNG files, not SVG
  // 'android_ldpi': 'public/timeharbor-icon.svg',
  // 'android_mdpi': 'public/timeharbor-icon.svg',
  // 'android_hdpi': 'public/timeharbor-icon.svg',
  // 'android_xhdpi': 'public/timeharbor-icon.svg'
});

// Launch screens
App.launchScreens({
  'iphone': 'public/timeharbor-icon.svg',
  'iphone_2x': 'public/timeharbor-icon.svg',
  'iphone_3x': 'public/timeharbor-icon.svg'
});
