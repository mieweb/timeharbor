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
