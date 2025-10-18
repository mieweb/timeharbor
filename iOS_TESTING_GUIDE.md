# Time Harbor iOS App Testing Guide

## 🎯 Overview
This guide covers testing the Time Harbor iOS app that was built using Meteor and GitHub Actions.

## 📱 Testing Checklist

### 1. GitHub Actions Build Testing
- [ ] Check GitHub Actions workflow execution
- [ ] Verify iOS build artifacts are generated
- [ ] Download `.ipa` file from artifacts
- [ ] Verify build logs for any errors

### 2. iOS App Installation Testing
- [ ] Install `.ipa` file on iOS device (requires developer account)
- [ ] Test app launch and basic functionality
- [ ] Verify app connects to your Proxmox server
- [ ] Test user authentication (Google/GitHub OAuth)

### 3. Push Notification Testing
- [ ] Enable iOS notifications in app settings
- [ ] Test notification permission request
- [ ] Send test notification from app
- [ ] Verify notification delivery
- [ ] Test notification actions (tap to open)

### 4. Core Feature Testing
- [ ] **Time Logging**: Clock in/out functionality
- [ ] **Teams**: Join/create teams
- [ ] **Tickets**: View and manage tickets
- [ ] **Calendar**: View calendar events
- [ ] **Mobile UI**: Touch interactions, navigation

### 5. Cross-Platform Testing
- [ ] Verify web app still works normally
- [ ] Test that iOS app uses same database
- [ ] Confirm user accounts work across platforms
- [ ] Test push notifications work on both platforms

## 🔧 Testing Steps

### Step 1: Check GitHub Actions
1. Go to your GitHub repository
2. Click on "Actions" tab
3. Look for "Build iOS App" workflow
4. Check if it completed successfully
5. Download artifacts if build succeeded

### Step 2: Install iOS App
1. Download the `.ipa` file from GitHub Actions artifacts
2. Install on iOS device using Xcode or TestFlight
3. Launch the app and test basic functionality

### Step 3: Test Push Notifications
1. Open the app on iOS device
2. Go to Settings → Notifications
3. Enable iOS push notifications
4. Send a test notification
5. Verify notification appears on device

### Step 4: Test Core Features
1. **Login**: Test Google/GitHub OAuth
2. **Teams**: Join existing team or create new one
3. **Time Logging**: Clock in/out on tickets
4. **Mobile UI**: Test touch interactions, navigation
5. **Notifications**: Verify team activity notifications

## 🐛 Common Issues & Solutions

### Build Issues
- **Meteor not found**: Ensure Meteor is installed in GitHub Actions
- **iOS platform missing**: Run `meteor add-platform ios`
- **Xcode errors**: Check Xcode version in workflow

### App Issues
- **App won't launch**: Check iOS version compatibility
- **Can't connect to server**: Verify server URL in mobile-config.js
- **Push notifications not working**: Check Firebase configuration

### Notification Issues
- **No notifications**: Verify APNs certificates
- **Permission denied**: Check iOS notification settings
- **Token registration failed**: Check Firebase Sender ID

## 📊 Test Results Template

```
iOS App Testing Results
======================

Date: ___________
Tester: ___________
Device: ___________
iOS Version: ___________

Build Status:
- [ ] GitHub Actions successful
- [ ] .ipa file generated
- [ ] App installs successfully

Core Features:
- [ ] User authentication works
- [ ] Time logging functional
- [ ] Teams management works
- [ ] Tickets view works
- [ ] Calendar displays correctly

Push Notifications:
- [ ] Permission granted
- [ ] Test notification sent
- [ ] Notification received
- [ ] Notification tap works

Mobile UI:
- [ ] Navigation smooth
- [ ] Touch interactions work
- [ ] Responsive design
- [ ] iOS-specific features work

Issues Found:
1. ________________
2. ________________
3. ________________

Overall Status: [ ] PASS [ ] FAIL [ ] NEEDS WORK
```

## 🚀 Next Steps After Testing

1. **Fix any issues** found during testing
2. **Configure Firebase** for production APNs
3. **Prepare for App Store** submission
4. **Create Android version** (separate ticket)

## 📞 Support

If you encounter issues:
1. Check GitHub Actions logs
2. Review mobile-config.js settings
3. Verify Firebase configuration
4. Check iOS device logs

## 🔗 Useful Links

- [GitHub Actions](https://github.com/mieweb/timeharbor/actions)
- [Firebase Console](https://console.firebase.google.com/)
- [Apple Developer Portal](https://developer.apple.com/)
- [Meteor iOS Guide](https://docs.meteor.com/platforms/mobile.html)
