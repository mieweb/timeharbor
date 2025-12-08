
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



// Android permissions
App.accessRule('https://*');
App.accessRule('http://*');
App.accessRule('*');
// App icons - removed deprecated iOS keys to avoid warnings
// Android icons are optional - will use default if not specified
// App.icons({
//   // Add Android icons here if you have PNG files
// });

// Launch screens - removed deprecated keys to avoid warnings
// Launch screens are optional
// App.launchScreens({
//   // Add launch screens here if needed
// });

// Android specific settings
App.setPreference('android-minSdkVersion', '23');
App.setPreference('android-targetSdkVersion', '35'); // Required by dependencies
App.setPreference('android-compileSdkVersion', '35'); // Must match or exceed targetSdkVersion
App.setPreference('StatusBarStyle', 'lightcontent');
App.setPreference('StatusBarBackgroundColor', '#ffffff');

// Configure Push Plugin for FCM
App.configurePlugin('cordova-plugin-push', {
  SENDER_ID: '991518210130' // FCM Sender ID from settings.json
});

// Android permissions for push notifications
App.appendToConfig(`
  <config-file target="AndroidManifest.xml" parent="/manifest">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
  </config-file>
  <resource-file src="private/google-services.json" target="app/google-services.json" />
`);

// iOS specific settings (for when building on Mac)
App.setPreference('StatusBarStyle', 'lightcontent');

// WebView settings
App.setPreference('DisallowOverscroll', true);
App.setPreference('EnableViewportScale', false);
App.setPreference('AllowInlineMediaPlayback', true);