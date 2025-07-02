App.info({
  id: 'com.mieweb.timeharbor',
  name: 'TimeHarbor',
  description: 'Personal time tracking assistant',
  author: 'MIE Web',
  email: 'support@mieweb.com',
  website: 'https://github.com/mieweb/timeharbor',
  version: '1.0.0'
});

App.icons({
  'iphone_2x': 'public/icons/icon-60@2x.png',
  'iphone_3x': 'public/icons/icon-60@3x.png',
  'ipad': 'public/icons/icon-76.png',
  'ipad_2x': 'public/icons/icon-76@2x.png',
  'ipad_pro': 'public/icons/icon-83.5@2x.png',
  'ios_settings': 'public/icons/icon-29.png',
  'ios_settings_2x': 'public/icons/icon-29@2x.png',
  'ios_settings_3x': 'public/icons/icon-29@3x.png',
  'ios_spotlight': 'public/icons/icon-40.png',
  'ios_spotlight_2x': 'public/icons/icon-40@2x.png',
  'ios_spotlight_3x': 'public/icons/icon-40@3x.png',
  'ios_notification': 'public/icons/icon-20.png',
  'ios_notification_2x': 'public/icons/icon-20@2x.png',
  'ios_notification_3x': 'public/icons/icon-20@3x.png'
});

App.launchScreens({
  'iphone5': 'public/splash/splash-568h@2x.png',
  'iphone6': 'public/splash/splash-667h@2x.png',
  'iphone6p_portrait': 'public/splash/splash-736h@3x.png',
  'iphone6p_landscape': 'public/splash/splash-736w@3x.png',
  'iphonex_portrait': 'public/splash/splash-1125h@3x.png',
  'iphonex_landscape': 'public/splash/splash-1125w@3x.png',
  'ipad_portrait': 'public/splash/splash-768h.png',
  'ipad_portrait_2x': 'public/splash/splash-768h@2x.png',
  'ipad_landscape': 'public/splash/splash-1024w.png',
  'ipad_landscape_2x': 'public/splash/splash-1024w@2x.png'
});

App.setPreference('BackgroundMode', 'audio');
App.setPreference('Orientation', 'portrait');
App.setPreference('AutoHideSplashScreen', false);
App.setPreference('SplashScreenDelay', 3000);
App.setPreference('ShowSplashScreenSpinner', false);

// iOS specific settings
App.setPreference('target-device', 'universal');
App.setPreference('deployment-target', '12.0');

// Push notification configuration
App.setPreference('ios-configuration-type', 'debug');

App.accessRule('*');