# iOS Device Testing Guide

This guide provides instructions for testing the TimeHarbor iOS app on physical devices.

## Prerequisites

### Development Environment
- macOS with Xcode installed
- Meteor CLI installed
- iOS device (iPhone/iPad) running iOS 12.0 or later
- Apple Developer account (for device testing)

### Certificate Setup
1. Generate iOS development certificate in Apple Developer Console
2. Create App ID: `com.mieweb.timeharbor`
3. Register test devices by UDID
4. Create development provisioning profile
5. Download and install certificates in Keychain

## Testing Steps

### 1. Prepare the App
```bash
# Navigate to project directory
cd /path/to/timeharbor

# Install dependencies
meteor npm install

# Add iOS platform (if not already added)
meteor add-platform ios

# Build for device
meteor run ios-device --mobile-server=https://your-server.com
```

### 2. Device Installation
```bash
# Alternative: Build archive for manual installation
meteor build ../build --server=https://your-server.com

# Install via Xcode
open ../build/ios/project/TimeHarbor.xcworkspace
# Use Xcode to build and install on connected device
```

### 3. Push Notification Testing

#### Setup APNs
1. Configure push notification certificates in Apple Developer Console
2. Export certificates as .p12 files
3. Convert to .pem format:
   ```bash
   openssl pkcs12 -in cert.p12 -out apns-cert.pem -nodes -clcerts
   openssl pkcs12 -in key.p12 -out apns-key.pem -nodes -nocerts
   ```

#### Update Server Configuration
```javascript
// In server/main.js, update push configuration
Push.Configure({
  apn: {
    passphrase: 'your-certificate-passphrase',
    key: '/path/to/apns-key.pem',
    cert: '/path/to/apns-cert.pem',
    production: false // Set to true for production
  }
});
```

### 4. Test Scenarios

#### Basic Functionality
- [ ] App launches successfully
- [ ] User registration and login work
- [ ] Navigation between screens works
- [ ] Touch targets are appropriately sized
- [ ] App responds correctly to device rotation

#### Time Logging
- [ ] Create new project/team
- [ ] Create new activity/ticket
- [ ] Start/stop time logging
- [ ] View time tracking history
- [ ] Time updates correctly in real-time

#### Push Notifications
- [ ] Navigate to notification settings
- [ ] Enable push notifications (system permission prompt)
- [ ] Select projects to follow
- [ ] Choose notification event types
- [ ] Save preferences successfully

#### Notification Delivery
- [ ] Start time logging on one device
- [ ] Verify notification received on other team member devices
- [ ] Check notification content and formatting
- [ ] Test notification actions (if implemented)
- [ ] Verify notifications don't appear for the action performer

#### Mobile UI/UX
- [ ] Bottom navigation works correctly
- [ ] Mobile menu slides properly
- [ ] Touch scrolling is smooth
- [ ] Forms are easy to use on mobile
- [ ] Text is readable at various zoom levels

### 5. Performance Testing
- [ ] App launch time < 3 seconds
- [ ] Navigation transitions are smooth
- [ ] No memory leaks during extended use
- [ ] Battery usage is reasonable
- [ ] Network requests handle poor connectivity

### 6. Device-Specific Testing

#### iPhone Testing
- [ ] iPhone SE (small screen)
- [ ] iPhone 8 (standard screen)
- [ ] iPhone 12+ (Face ID, notch)
- [ ] iPhone 14+ (Dynamic Island)

#### iPad Testing
- [ ] iPad (standard size)
- [ ] iPad Pro (large screen)
- [ ] Split-screen multitasking
- [ ] Keyboard support

#### iOS Version Testing
- [ ] iOS 12.x (minimum supported)
- [ ] iOS 15.x (common version)
- [ ] iOS 16.x (current major)
- [ ] iOS 17.x (latest)

### 7. Troubleshooting

#### Common Issues
- **App won't install**: Check provisioning profile and device registration
- **Push notifications not working**: Verify APNs certificates and configuration
- **App crashes on launch**: Check console logs for JavaScript errors
- **Time logging not syncing**: Verify server connection and Meteor DDP

#### Debug Tools
- Safari Web Inspector for debugging web views
- Xcode console for native crash logs
- Meteor logs for server-side issues
- Network tab for API call debugging

### 8. Production Deployment

#### App Store Preparation
1. Update mobile-config.js with production settings
2. Create production APNs certificates
3. Build with production server URL
4. Test with production push service
5. Create App Store screenshots and metadata
6. Submit for App Store review

#### TestFlight Distribution
1. Archive app with distribution certificate
2. Upload to App Store Connect
3. Add external testers
4. Distribute beta builds for wider testing

## Reporting Issues

When reporting bugs or issues:
1. Include device model and iOS version
2. Provide step-by-step reproduction steps
3. Include screenshots or screen recordings
4. Check browser console for JavaScript errors
5. Include relevant server logs if available

## Next Steps

After successful device testing:
- [ ] Update documentation with any issues found
- [ ] Submit bug fixes and improvements
- [ ] Prepare for App Store submission
- [ ] Plan Android version development