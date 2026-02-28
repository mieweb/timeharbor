# TimeHarbor Browser Extension - Installation & Development Guide

## Overview

The TimeHarbor Browser Extension captures tab screenshots and stores them with configurable modes:
- **Local Only**: Save to computer with HTML activity log
- **Server Only**: Upload to TimeHarbor server  
- **Both**: Save locally AND upload to server

## Directory Structure

```
extension/
├── safari/                   # Safari App Extension
│   ├── TimeHarbor Extension.xcodeproj
│   └── TimeHarbor Extension/
│       ├── SafariWebExtensionHandler.swift
│       ├── Info.plist
│       └── Resources/
│           ├── manifest.json
│           ├── popup.html
│           ├── popup.js
│           ├── background.js
│           ├── content.js
│           ├── styles/popup.css
│           └── icons/
├── shared/                   # Shared JavaScript modules
│   ├── storage-manager.js    # Core storage mode handling
│   ├── html-log-generator.js # Activity log creation
│   ├── api-client.js         # Server communication
│   └── screenshot-handler.js # Screenshot capture
├── templates/
│   └── activity-log.html     # Activity log template
└── docs/
    └── API.md               # Server API specification
```

## Installation - Safari Extension

### Prerequisites

- macOS 10.14.4 or later
- Xcode 13.0 or later
- Safari 14.0 or later

### Development Setup

1. **Open the Xcode Project**
   ```bash
   cd extension/safari
   open "TimeHarbor Extension.xcodeproj"
   ```

2. **Configure Code Signing**
   - Select the project in Xcode
   - Choose a Development Team
   - Update Bundle Identifier if needed

3. **Build and Run**
   - Select "TimeHarbor Extension" scheme
   - Build (⌘+B) and Run (⌘+R)
   - Safari will launch with extension loaded

4. **Enable Extension in Safari**
   - Safari > Preferences > Extensions
   - Check "TimeHarbor" to enable
   - Grant website access permissions

### First Use

1. **Set Storage Mode**
   - Click TimeHarbor toolbar button
   - Select desired storage mode (Local/Server/Both)
   - Configure settings if using server mode

2. **Capture Screenshot**
   - Navigate to any webpage
   - Click TimeHarbor toolbar button or use ⌘⇧H
   - Screenshot is captured and processed

3. **View Activity Log**
   - Click "View Activity Log" in popup
   - Browse captured screenshots in timeline view

## Storage Locations (Local Mode)

```
~/Documents/TimeHarbor/
├── captures/
│   └── 2025/09/04/
│       ├── capture_20250904_103045_001.png
│       └── capture_20250904_103045_001.json
├── logs/
│   ├── activity_log.html     # Main browsable log
│   └── activity_data.js      # Activity data
└── settings/
    └── extension_config.json
```

## Server Mode Setup

1. **Configure TimeHarbor Server**
   - Ensure TimeHarbor server is running
   - Verify API endpoints are accessible (see docs/API.md)

2. **Extension Settings**
   - Open extension popup
   - Select "Server Only" or "Both" mode
   - Configure server URL and authentication

3. **Authentication**
   - Click "Test Connection" to verify server access
   - Authenticate with TimeHarbor credentials if required

## Development

### Building from Source

1. **Clone Repository**
   ```bash
   git clone https://github.com/mieweb/timeharbor.git
   cd timeharbor/extension
   ```

2. **Development Workflow**
   - Edit JavaScript files in `shared/` or `safari/Resources/`
   - Modify Swift code in `SafariWebExtensionHandler.swift`
   - Rebuild in Xcode to test changes

### JavaScript Architecture

- **Background Script**: Main extension logic, messaging coordination
- **Content Script**: Page interaction, metadata extraction
- **Popup**: User interface for settings and manual capture
- **Storage Manager**: Handles three storage modes with offline queue
- **HTML Log Generator**: Creates and maintains activity log

### Testing

1. **Manual Testing**
   - Test each storage mode (Local/Server/Both)
   - Verify screenshot capture on different page types
   - Check HTML activity log generation
   - Test offline/online sync behavior

2. **Debug Console**
   - Safari > Develop > Web Extension Background Pages
   - Monitor console for errors and logging

### Common Issues

1. **Extension Not Loading**
   - Check code signing configuration
   - Verify Info.plist permissions
   - Rebuild and reinstall extension

2. **Screenshot Capture Fails**
   - Check page permissions (some pages block capture)
   - Verify WKWebView access in Safari
   - Check native messaging implementation

3. **File System Access**
   - Ensure proper macOS permissions
   - Check Documents folder access
   - Verify path expansion in Swift code

## Chrome Extension (Future Phase)

The architecture is designed to support Chrome extension with minimal changes:

1. **Manifest V3**: Update manifest.json for Chrome
2. **Native Messaging**: Implement native host for file system access
3. **API Compatibility**: Shared JavaScript modules work across browsers

## Configuration

### Extension Settings

```json
{
  "storageMode": "local",           // "local", "server", "both"
  "serverUrl": "https://localhost:3000",
  "storagePath": "~/Documents/TimeHarbor/",
  "authToken": null,
  "autoSync": true,
  "imageQuality": 0.8,
  "autoCloseTab": false
}
```

### Storage Modes

- **Local Only**: Fast, private, works offline
- **Server Only**: Cloud storage, sync across devices
- **Both (Hybrid)**: Best of both worlds, with offline fallback

## Security & Privacy

- **Local Storage**: Files stored in user's Documents folder
- **Server Communication**: HTTPS with token authentication
- **Permissions**: Minimal required permissions for functionality
- **Privacy**: No tracking, user controls all data sharing

## Support

- **Issues**: Report bugs in GitHub repository
- **Feature Requests**: Create GitHub issues with enhancement label
- **Development**: See CONTRIBUTING.md for development guidelines