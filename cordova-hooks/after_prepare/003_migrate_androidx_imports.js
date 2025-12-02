#!/usr/bin/env node

/**
 * Cordova hook to migrate phonegap-plugin-push from Android Support Library to AndroidX
 */

var fs = require('fs');
var path = require('path');

module.exports = function(context) {
    var projectRoot = context.opts.projectRoot;
    var javaSourcePath = path.join(projectRoot, 'platforms', 'android', 'app', 'src', 'main', 'java', 'com', 'adobe', 'phonegap', 'push');
    
    if (!fs.existsSync(javaSourcePath)) {
        return;
    }
    
    var filesToMigrate = [
        'BackgroundActionButtonHandler.java',
        'FCMService.java',
        'PushHandlerActivity.java',
        'PushPlugin.java'
    ];
    
    var migrationMap = {
        'android.support.v4.app.NotificationCompat': 'androidx.core.app.NotificationCompat',
        'android.support.v4.app.NotificationManagerCompat': 'androidx.core.app.NotificationManagerCompat',
        'android.support.v4.app.RemoteInput': 'androidx.core.app.RemoteInput',
        'android.support.v4.app.NotificationCompat.WearableExtender': 'androidx.core.app.NotificationCompat.WearableExtender'
    };
    
    filesToMigrate.forEach(function(fileName) {
        var filePath = path.join(javaSourcePath, fileName);
        
        if (!fs.existsSync(filePath)) {
            return;
        }
        
        var content = fs.readFileSync(filePath, 'utf8');
        var originalContent = content;
        
        for (var oldImport in migrationMap) {
            var newImport = migrationMap[oldImport];
            content = content.replace(
                new RegExp('import\\s+' + oldImport.replace(/\./g, '\\.') + ';', 'g'),
                'import ' + newImport + ';'
            );
        }
        
        content = content.replace(/android\.support\.v4\.app\.NotificationCompat/g, 'androidx.core.app.NotificationCompat');
        content = content.replace(/android\.support\.v4\.app\.NotificationManagerCompat/g, 'androidx.core.app.NotificationManagerCompat');
        content = content.replace(/android\.support\.v4\.app\.RemoteInput/g, 'androidx.core.app.RemoteInput');
        
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
        }
    });
};
