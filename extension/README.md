# TimeHarbor Browser Extension

A Safari browser extension for capturing and storing tab screenshots with configurable storage modes.

## Features

- **One-Click Screenshot Capture**: Toolbar button for instant tab capture
- **Flexible Storage Modes**: 
  - Local Only: Store screenshots locally with HTML log
  - Server Only: Upload to TimeHarbor server
  - Both: Store locally AND upload to server
- **HTML Activity Log**: Browsable timeline of all captures
- **Auto-Sync**: Automatic upload when online (server modes)

## Development Structure

```
extension/
├── safari/               # Safari App Extension
│   ├── TimeHarbor Extension.xcodeproj
│   ├── TimeHarbor Extension/
│   │   ├── SafariWebExtensionHandler.swift
│   │   ├── Info.plist
│   │   └── Resources/
│   │       ├── manifest.json
│   │       ├── popup.html
│   │       ├── popup.js
│   │       ├── content.js
│   │       ├── background.js
│   │       └── styles/
├── shared/               # Shared JavaScript modules
│   ├── storage-manager.js
│   ├── html-log-generator.js
│   ├── api-client.js
│   └── screenshot-handler.js
├── templates/            # HTML templates
│   ├── activity-log.html
│   └── settings.html
└── docs/                # Documentation
    └── API.md
```

## Installation

1. Open Safari
2. Enable Developer menu (Safari > Preferences > Advanced)
3. Open extension project in Xcode
4. Build and run extension
5. Enable extension in Safari preferences

## Usage

1. Click TimeHarbor toolbar button
2. Screenshot is captured based on current storage mode
3. View activity in HTML log or TimeHarbor web app