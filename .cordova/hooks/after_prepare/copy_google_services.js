#!/usr/bin/env node

/**
 * Cordova hook to copy google-services.json to Android app directory
 * This hook runs after the platform is prepared, ensuring the file is
 * always present for builds even after Meteor regenerates the Cordova project
 */

const fs = require('fs');
const path = require('path');

module.exports = function(context) {
    // Get the project root - could be context.opts.projectRoot or process.cwd()
    const projectRoot = context.opts.projectRoot || process.cwd();
    const platformPath = path.join(projectRoot, '.meteor', 'local', 'cordova-build', 'platforms', 'android', 'app');
    const sourceFile = path.join(projectRoot, 'private', 'google-services.json');
    const targetFile = path.join(platformPath, 'google-services.json');

    // Only run for Android platform
    const platforms = context.opts.platforms || [];
    if (platforms.indexOf('android') === -1) {
        return;
    }

    // Check if source file exists
    if (!fs.existsSync(sourceFile)) {
        console.warn('WARNING: google-services.json not found at', sourceFile);
        console.warn('Push notifications may not work without this file.');
        return;
    }

    // Ensure target directory exists
    if (!fs.existsSync(platformPath)) {
        console.warn('WARNING: Android app directory not found at', platformPath);
        console.warn('This is normal if the platform hasn\'t been prepared yet.');
        return;
    }

    // Copy the file
    try {
        fs.copyFileSync(sourceFile, targetFile);
        console.log('✓ Copied google-services.json to Android app directory');
    } catch (error) {
        console.error('ERROR: Failed to copy google-services.json:', error.message);
        // Don't throw - allow build to continue, but warn the user
        console.error('Build may fail if Google Services plugin requires this file.');
    }
};

