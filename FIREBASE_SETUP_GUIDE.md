# Firebase Setup for Time Harbor iOS Push Notifications

## 🎯 Overview
This guide will help you set up Firebase Cloud Messaging (FCM) for iOS push notifications in your Time Harbor app.

## 📋 Prerequisites
- Google account
- Apple Developer account (for APNs certificates)
- iOS device for testing

## 🔧 Step-by-Step Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `timeharbor-ios`
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Add iOS App to Firebase
1. In Firebase Console, click "Add app"
2. Select iOS platform
3. Enter iOS bundle ID: `com.idwmd07z7j7xfm.ly2dw8u9q4jj` (from mobile-config.js)
4. Enter app nickname: `Time Harbor iOS`
5. Click "Register app"

### Step 3: Download Configuration File
1. Download `GoogleService-Info.plist`
2. Place it in your Meteor project root directory
3. Add to `.gitignore` to keep it secure

### Step 4: Configure APNs Certificates
1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Click "Upload" under iOS app certificates
3. Upload your APNs certificate or key
4. Note the Sender ID (you'll need this)

### Step 5: Update Mobile Configuration
Replace the placeholder in `mobile-config.js`:

```javascript
App.configurePlugin('phonegap-plugin-push', {
  SENDER_ID: 'YOUR_ACTUAL_FIREBASE_SENDER_ID' // Replace with actual Sender ID
});
```

### Step 6: Update Server Configuration
Add Firebase configuration to your server:

```javascript
// In server/utils/iosPushNotifications.js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "timeharbor-ios.firebaseapp.com",
  projectId: "timeharbor-ios",
  storageBucket: "timeharbor-ios.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## 🔑 Required Values

You'll need these values from Firebase Console:

1. **Sender ID**: Found in Project Settings → Cloud Messaging
2. **Server Key**: Found in Project Settings → Cloud Messaging
3. **Bundle ID**: `com.idwmd07z7j7xfm.ly2dw8u9q4jj`
4. **Project ID**: `timeharbor-ios`

## 📱 Testing Push Notifications

### Test from Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter notification title and text
4. Select your iOS app
5. Click "Send test message"

### Test from Time Harbor App
1. Open iOS app
2. Go to Settings → Notifications
3. Click "Send Test"
4. Enter test message
5. Verify notification appears

## 🛠️ Troubleshooting

### Common Issues
- **Notifications not received**: Check APNs certificate
- **Permission denied**: Verify iOS notification settings
- **Token registration failed**: Check Sender ID configuration

### Debug Steps
1. Check Firebase Console logs
2. Verify iOS device logs
3. Test with Firebase Console test message
4. Check Meteor server logs

## 🔒 Security Notes

- Keep `GoogleService-Info.plist` secure
- Don't commit sensitive keys to Git
- Use environment variables for production
- Rotate keys regularly

## 📊 Configuration Checklist

- [ ] Firebase project created
- [ ] iOS app added to Firebase
- [ ] `GoogleService-Info.plist` downloaded
- [ ] APNs certificate uploaded
- [ ] Sender ID updated in mobile-config.js
- [ ] Server configuration updated
- [ ] Test notification sent successfully

## 🚀 Production Deployment

For production deployment:
1. Create production Firebase project
2. Use production APNs certificate
3. Update bundle ID for App Store
4. Configure production server keys
5. Test thoroughly before release

## 📞 Support

If you need help:
- [Firebase Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Meteor Push Package](https://github.com/activitree/push)
- [Apple Push Notifications](https://developer.apple.com/notifications/)
