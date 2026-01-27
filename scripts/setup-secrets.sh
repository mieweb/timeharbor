#!/bin/bash

# Configuration files setup script
# This script reconstructs sensitive files from Base64 environment variables.

# 1. Google Services JSON (Android)
if [ -n "$GOOGLE_SERVICES_JSON_BASE64" ]; then
    echo "Decoding GOOGLE_SERVICES_JSON_BASE64..."
    echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 --decode > google-services.json
    echo "Created google-services.json"
else
    echo "Warning: GOOGLE_SERVICES_JSON_BASE64 not set."
fi

# 2. Google Service Info Plist (iOS)
if [ -n "$GOOGLE_SERVICES_INFO_PLIST_BASE64" ]; then
    echo "Decoding GOOGLE_SERVICES_INFO_PLIST_BASE64..."
    echo "$GOOGLE_SERVICES_INFO_PLIST_BASE64" | base64 --decode > GoogleService-Info.plist
    echo "Created GoogleService-Info.plist"
else
    echo "Warning: GOOGLE_SERVICES_INFO_PLIST_BASE64 not set."
fi

# 3. Meteor Settings JSON
if [ -n "$METEOR_SETTINGS" ]; then
    echo "Creating settings.json from METEOR_SETTINGS..."
    echo "$METEOR_SETTINGS" > settings.json
    echo "Created settings.json"
else
    echo "Warning: METEOR_SETTINGS not set."
fi
