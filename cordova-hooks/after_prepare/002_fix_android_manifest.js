#!/usr/bin/env node

/**
 * Cordova hook to fix AndroidManifest.xml for Android 12+ compatibility
 * Adds android:exported attribute to services that require it
 */

var fs = require('fs');
var path = require('path');

module.exports = function(context) {
    var projectRoot = context.opts.projectRoot;
    var androidAppPath = path.join(projectRoot, 'platforms', 'android', 'app');
    var androidPlatformPath = path.join(projectRoot, 'platforms', 'android');
    var manifestPath = path.join(androidAppPath, 'src', 'main', 'AndroidManifest.xml');
    
    // Copy build-extras.gradle if it exists
    var meteorProjectRoot = path.join(projectRoot, '..', '..', '..');
    var buildExtrasSource = path.join(meteorProjectRoot, 'build-extras.gradle');
    var buildExtrasDest1 = path.join(androidAppPath, 'build-extras.gradle');
    var buildExtrasDest2 = path.join(androidPlatformPath, 'build-extras.gradle');
    
    if (fs.existsSync(buildExtrasSource)) {
        if (fs.existsSync(androidAppPath)) {
            try {
                if (!fs.existsSync(buildExtrasDest1) || fs.statSync(buildExtrasSource).mtime > fs.statSync(buildExtrasDest1).mtime) {
                    fs.copyFileSync(buildExtrasSource, buildExtrasDest1);
                }
            } catch (err) {
                // Silent fail
            }
        }
        
        if (fs.existsSync(androidPlatformPath)) {
            try {
                if (!fs.existsSync(buildExtrasDest2) || fs.statSync(buildExtrasSource).mtime > fs.statSync(buildExtrasDest2).mtime) {
                    fs.copyFileSync(buildExtrasSource, buildExtrasDest2);
                }
            } catch (err) {
                // Silent fail
            }
        }
    }
    
    if (!fs.existsSync(manifestPath)) {
        return;
    }
    
    // Fix android.json to prevent duplicates
    var androidJsonPath = path.join(androidPlatformPath, 'android.json');
    if (fs.existsSync(androidJsonPath)) {
        try {
            var androidJson = JSON.parse(fs.readFileSync(androidJsonPath, 'utf8'));
            var modified = false;
            
            if (androidJson.config_munge && androidJson.config_munge.files && 
                androidJson.config_munge.files['AndroidManifest.xml'] &&
                androidJson.config_munge.files['AndroidManifest.xml'].parents &&
                androidJson.config_munge.files['AndroidManifest.xml'].parents['/manifest/application']) {
                
                var appParents = androidJson.config_munge.files['AndroidManifest.xml'].parents['/manifest/application'];
                for (var i = 0; i < appParents.length; i++) {
                    var parent = appParents[i];
                    if (parent.xml && parent.xml.includes('com.adobe.phonegap.push.FCMService') && !parent.xml.includes('android:exported')) {
                        parent.xml = parent.xml.replace(
                            /<service android:name="com\.adobe\.phonegap\.push\.FCMService">/,
                            '<service android:exported="false" android:name="com.adobe.phonegap.push.FCMService">'
                        );
                        modified = true;
                    }
                    if (parent.xml && parent.xml.includes('com.adobe.phonegap.push.PushInstanceIDListenerService') && !parent.xml.includes('android:exported')) {
                        parent.xml = parent.xml.replace(
                            /<service android:name="com\.adobe\.phonegap\.push\.PushInstanceIDListenerService">/,
                            '<service android:exported="false" android:name="com.adobe.phonegap.push.PushInstanceIDListenerService">'
                        );
                        modified = true;
                    }
                }
            }
            
            if (modified) {
                fs.writeFileSync(androidJsonPath, JSON.stringify(androidJson, null, 2), 'utf8');
            }
        } catch (err) {
            console.error('[Cordova Hook] Error fixing android.json: ' + err.message);
        }
    }
    
    // Fix AndroidManifest.xml
    var content = fs.readFileSync(manifestPath, 'utf8');
    var updatedContent = content;
    
    // Remove all instances of duplicate services
    updatedContent = updatedContent.replace(
        /<service[^>]*android:name="com\.adobe\.phonegap\.push\.FCMService"[^>]*>[\s\S]*?<\/service>/g,
        ''
    );
    updatedContent = updatedContent.replace(
        /<service[^>]*android:name="com\.adobe\.phonegap\.push\.PushInstanceIDListenerService"[^>]*>[\s\S]*?<\/service>/g,
        ''
    );
    
    // Add back services with android:exported="false"
    var fcmService = '        <service android:exported="false" android:name="com.adobe.phonegap.push.FCMService">\n            <intent-filter>\n                <action android:name="com.google.firebase.MESSAGING_EVENT" />\n            </intent-filter>\n        </service>';
    var instanceIdService = '        <service android:exported="false" android:name="com.adobe.phonegap.push.PushInstanceIDListenerService">\n            <intent-filter>\n                <action android:name="com.google.firebase.INSTANCE_ID_EVENT" />\n            </intent-filter>\n        </service>';
    
    if (!updatedContent.includes('com.adobe.phonegap.push.FCMService')) {
        updatedContent = updatedContent.replace(
            /(<receiver android:name="com\.adobe\.phonegap\.push\.PushDismissedHandler" \/>)/,
            '$1\n' + fcmService + '\n' + instanceIdService
        );
    }
    
    updatedContent = updatedContent.replace(/\n\s*\n\s*\n+/g, '\n\n');
    
    if (content !== updatedContent) {
        fs.writeFileSync(manifestPath, updatedContent, 'utf8');
    }
};
