#!/usr/bin/env node

/**
 * Cordova hook to create google-services.json for FCM
 */

var fs = require('fs');
var path = require('path');

module.exports = function(context) {
    var projectRoot = context.opts.projectRoot;
    var googleServicesPath = path.join(projectRoot, 'platforms', 'android', 'app', 'google-services.json');

    var senderId = '991518210130';
    var packageName = 'com.mieweb.timeharbor';

    try {
        var settingsPath = path.join(projectRoot, 'settings.json');
        if (fs.existsSync(settingsPath)) {
            var settingsContent = fs.readFileSync(settingsPath, 'utf8');
            var settings = JSON.parse(settingsContent);
            if (settings.public && settings.public.fcmSenderId) {
                senderId = settings.public.fcmSenderId;
            }
        }
    } catch (error) {
        // Use default sender ID
    }

    var googleServicesJson = {
        "project_info": {
            "project_number": senderId,
            "project_id": "timeharbor-e8ff4",
            "storage_bucket": "timeharbor-e8ff4.firebasestorage.app"
        },
        "client": [
            {
                "client_info": {
                    "mobilesdk_app_id": "1:" + senderId + ":android:05b2b110447a23144bc78b",
                    "android_client_info": {
                        "package_name": packageName
                    }
                },
                "oauth_client": [],
                "api_key": [
                    {
                        "current_key": "AIzaSyDJK_jGQJH4L0OnFu68dCjp2uV06zZiQWY"
                    }
                ],
                "services": {
                    "appinvite_service": {
                        "other_platform_oauth_client": []
                    }
                }
            }
        ],
        "configuration_version": "1"
    };

    try {
        var dir = path.dirname(googleServicesPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(googleServicesPath, JSON.stringify(googleServicesJson, null, 2), 'utf8');
    } catch (error) {
        console.error('[Cordova Hook] Error creating google-services.json: ' + error.message);
    }
};
