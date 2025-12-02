#!/usr/bin/env node

/**
 * Cordova hook to add required string resources for phonegap-plugin-push
 */

var fs = require('fs');
var path = require('path');

module.exports = function(context) {
    var projectRoot = context.opts.projectRoot;
    var stringsXmlPath = path.join(projectRoot, 'platforms', 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');

    if (!fs.existsSync(stringsXmlPath)) {
        return;
    }

    try {
        var content = fs.readFileSync(stringsXmlPath, 'utf8');
        var updatedContent = content;

        var requiredStrings = {
            'gcm_defaultSenderId': '991518210130',
            'push_notification_channel_name': 'Push Notifications',
            'push_notification_channel_description': 'Notifications for TimeHarbor app',
            'push_notification_default_title': 'TimeHarbor',
            'push_notification_default_message': 'You have a new notification'
        };

        var needsUpdate = false;

        for (var key in requiredStrings) {
            var stringPattern = new RegExp('<string name="' + key + '">[^<]*</string>');
            if (!stringPattern.test(content)) {
                var insertPoint = updatedContent.lastIndexOf('</resources>');
                if (insertPoint !== -1) {
                    var indent = '    ';
                    var newString = indent + '<string name="' + key + '">' + requiredStrings[key] + '</string>\n';
                    updatedContent = updatedContent.slice(0, insertPoint) + newString + updatedContent.slice(insertPoint);
                    needsUpdate = true;
                }
            }
        }

        if (needsUpdate) {
            fs.writeFileSync(stringsXmlPath, updatedContent, 'utf8');
        }

    } catch (error) {
        console.error('[Cordova Hook] Error updating strings.xml: ' + error.message);
    }
};
