#!/usr/bin/env node

/**
 * Cordova hook to create Application class for early Firebase initialization
 */

var fs = require('fs');
var path = require('path');

module.exports = function(context) {
    var projectRoot = context.opts.projectRoot;
    var javaDir = path.join(projectRoot, 'platforms', 'android', 'app', 'src', 'main', 'java', 'com', 'mieweb', 'timeharbor');
    var applicationClassPath = path.join(javaDir, 'TimeHarborApplication.java');
    var manifestPath = path.join(projectRoot, 'platforms', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

    // Create Application class
    if (!fs.existsSync(applicationClassPath)) {
        try {
            if (!fs.existsSync(javaDir)) {
                fs.mkdirSync(javaDir, { recursive: true });
            }

            var applicationClassContent = `package com.mieweb.timeharbor;

import android.app.Application;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public class TimeHarborApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        
        try {
            FirebaseApp defaultApp = null;
            try {
                defaultApp = FirebaseApp.getInstance();
            } catch (IllegalStateException e) {
                // Not initialized yet
            }
            
            if (defaultApp == null) {
                try {
                    FirebaseApp.initializeApp(this);
                    defaultApp = FirebaseApp.getInstance();
                } catch (Exception e) {
                    // Try manual initialization
                    try {
                        FirebaseOptions options = new FirebaseOptions.Builder()
                            .setApplicationId("1:991518210130:android:05b2b110447a23144bc78b")
                            .setApiKey("AIzaSyDJK_jGQJH4L0OnFu68dCjp2uV06zZiQWY")
                            .setGcmSenderId("991518210130")
                            .setProjectId("timeharbor-e8ff4")
                            .setStorageBucket("timeharbor-e8ff4.firebasestorage.app")
                            .build();
                        
                        FirebaseApp.initializeApp(this, options);
                    } catch (Exception e2) {
                        // Initialization failed
                    }
                }
            }
        } catch (Exception e) {
            // Initialization failed
        }
    }
}
`;

            fs.writeFileSync(applicationClassPath, applicationClassContent, 'utf8');
        } catch (error) {
            console.error('[Cordova Hook] Error creating Application class: ' + error.message);
        }
    }

    // Update AndroidManifest.xml to use the Application class
    if (fs.existsSync(manifestPath)) {
        try {
            var manifestContent = fs.readFileSync(manifestPath, 'utf8');
            var updatedContent = manifestContent;

            if (!manifestContent.includes('android:name="com.mieweb.timeharbor.TimeHarborApplication"')) {
                if (manifestContent.includes('<application')) {
                    updatedContent = updatedContent.replace(
                        /(<application[^>]*)(android:hardwareAccelerated)/,
                        '$1 android:name="com.mieweb.timeharbor.TimeHarborApplication" $2'
                    );
                    fs.writeFileSync(manifestPath, updatedContent, 'utf8');
                }
            }
        } catch (error) {
            console.error('[Cordova Hook] Error updating AndroidManifest.xml: ' + error.message);
        }
    }
};
