/**
 * TimeHarbor Background Script
 * Handles extension lifecycle, toolbar button clicks, and messaging
 */

// Load shared modules
importScripts('../shared/storage-manager.js');
importScripts('../shared/screenshot-handler.js');
importScripts('../shared/api-client.js');
importScripts('../shared/html-log-generator.js');

// Initialize extension components
let storageManager;
let screenshotHandler;
let apiClient;
let htmlLogGenerator;

// Extension state
let isInitialized = false;
let currentCapture = null;

/**
 * Initialize extension on startup
 */
async function initializeExtension() {
  if (isInitialized) return;

  try {
    // Initialize core components
    storageManager = new TimeHarborStorageManager();
    screenshotHandler = new ScreenshotHandler();
    htmlLogGenerator = new HTMLLogGenerator();
    
    // Initialize storage manager and load settings
    await storageManager.initializeSettings();
    
    // Initialize API client with current settings
    const settings = storageManager.getSettings();
    apiClient = new TimeHarborAPIClient(settings.serverUrl, settings.authToken);
    
    // Initialize HTML log generator
    await htmlLogGenerator.initialize();
    
    // Set up event listeners
    setupEventListeners();
    
    isInitialized = true;
    console.log('TimeHarbor extension initialized successfully');
    
    // Set badge to indicate ready state
    chrome.browserAction.setBadgeText({ text: '' });
    chrome.browserAction.setBadgeBackgroundColor({ color: '#3498db' });
    
  } catch (error) {
    console.error('Failed to initialize TimeHarbor extension:', error);
    chrome.browserAction.setBadgeText({ text: '!' });
    chrome.browserAction.setBadgeBackgroundColor({ color: '#e74c3c' });
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Handle toolbar button clicks
  chrome.browserAction.onClicked.addListener(handleToolbarClick);
  
  // Handle keyboard shortcuts
  chrome.commands.onCommand.addListener(handleCommand);
  
  // Handle messages from content scripts and popup
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Handle extension updates
  chrome.runtime.onInstalled.addListener(handleInstalled);
  
  // Handle tab updates for sync queue processing
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
}

/**
 * Handle toolbar button click - main capture functionality
 */
async function handleToolbarClick(tab) {
  if (!isInitialized) {
    await initializeExtension();
  }

  try {
    // Check if tab is capturable
    if (!screenshotHandler.isTabCapturable(tab)) {
      showNotification('Cannot capture this page', 'This page type cannot be captured for security reasons.');
      return;
    }

    // Show capturing state
    if (chrome.browserAction && chrome.browserAction.setBadgeText) {
      chrome.browserAction.setBadgeText({ text: '📸' });
    }
    currentCapture = { tabId: tab.id, status: 'capturing' };

    // Capture screenshot and process
    const result = await captureAndStore(tab);
    
    // Show success state
    if (chrome.browserAction && chrome.browserAction.setBadgeText) {
      chrome.browserAction.setBadgeText({ text: '✓' });
    }
    showNotification('Screenshot captured!', `Saved ${result.mode} mode`);
    
    // Clear badge after delay
    setTimeout(() => {
      if (chrome.browserAction && chrome.browserAction.setBadgeText) {
        chrome.browserAction.setBadgeText({ text: '' });
      }
      currentCapture = null;
    }, 2000);

    // Close tab if configured (after a short delay)
    const settings = storageManager.getSettings();
    if (settings.autoCloseTab) {
      setTimeout(() => {
        chrome.tabs.remove(tab.id);
      }, 1000);
    }

  } catch (error) {
    console.error('Capture failed:', error);
    if (chrome.browserAction && chrome.browserAction.setBadgeText) {
      chrome.browserAction.setBadgeText({ text: '✗' });
      chrome.browserAction.setBadgeBackgroundColor({ color: '#e74c3c' });
    }
    showNotification('Capture failed', error.message);
    
    setTimeout(() => {
      if (chrome.browserAction && chrome.browserAction.setBadgeText) {
        chrome.browserAction.setBadgeText({ text: '' });
        chrome.browserAction.setBadgeBackgroundColor({ color: '#3498db' });
      }
      currentCapture = null;
    }, 3000);
  }
}

/**
 * Main capture and store functionality
 */
async function captureAndStore(tab) {
  // Capture screenshot
  const captureResult = await screenshotHandler.captureTab();
  
  // Store based on current mode
  const storeResult = await storageManager.captureAndStore({
    id: tab.id,
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl
  });

  return {
    ...storeResult,
    mode: storageManager.getStorageMode(),
    timestamp: captureResult.timestamp
  };
}

/**
 * Handle keyboard shortcuts
 */
async function handleCommand(command) {
  if (command === 'capture-screenshot') {
    // Get current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        handleToolbarClick(tabs[0]);
      }
    });
  }
}

/**
 * Handle messages from content scripts and popup
 */
function handleMessage(request, sender, sendResponse) {
  (async () => {
    try {
      switch (request.action) {
        case 'getStatus':
          sendResponse({
            initialized: isInitialized,
            storageMode: storageManager ? storageManager.getStorageMode() : 'local',
            settings: storageManager ? storageManager.getSettings() : {},
            currentCapture: currentCapture
          });
          break;

        case 'setStorageMode':
          if (storageManager) {
            await storageManager.setStorageMode(request.mode);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Extension not initialized' });
          }
          break;

        case 'updateSettings':
          if (storageManager) {
            await storageManager.updateSettings(request.settings);
            // Update API client if server settings changed
            if (request.settings.serverUrl || request.settings.authToken) {
              const settings = storageManager.getSettings();
              apiClient = new TimeHarborAPIClient(settings.serverUrl, settings.authToken);
            }
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Extension not initialized' });
          }
          break;

        case 'testConnection':
          if (apiClient) {
            const result = await apiClient.testConnection();
            sendResponse(result);
          } else {
            sendResponse({ success: false, error: 'API client not initialized' });
          }
          break;

        case 'authenticate':
          if (apiClient) {
            const result = await apiClient.authenticate(request.username, request.password);
            await storageManager.updateSettings({ authToken: result.token });
            sendResponse({ success: true, user: result.user });
          } else {
            sendResponse({ success: false, error: 'API client not initialized' });
          }
          break;

        case 'openActivityLog':
          openActivityLog();
          sendResponse({ success: true });
          break;

        case 'captureTab':
          if (sender.tab) {
            const result = await captureAndStore(sender.tab);
            sendResponse({ success: true, result: result });
          } else {
            sendResponse({ success: false, error: 'No tab context' });
          }
          break;

        case 'processSyncQueue':
          if (storageManager) {
            await storageManager.processSyncQueue();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Storage manager not initialized' });
          }
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  // Return true to indicate async response
  return true;
}

/**
 * Handle extension installation/update
 */
function handleInstalled(details) {
  if (details.reason === 'install') {
    // First time installation
    console.log('TimeHarbor extension installed');
    
    // Show welcome notification
    showNotification(
      'TimeHarbor installed!', 
      'Click the toolbar button to capture your first screenshot.'
    );
    
    // Initialize with default settings
    initializeExtension();
    
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('TimeHarbor extension updated');
    initializeExtension();
  }
}

/**
 * Handle tab updates for connectivity monitoring
 */
function handleTabUpdated(tabId, changeInfo, tab) {
  // Process sync queue when tab becomes active (indicates user is browsing)
  if (changeInfo.status === 'complete' && tab.active && storageManager) {
    storageManager.processSyncQueue();
  }
}

/**
 * Open activity log in new tab
 */
function openActivityLog() {
  const settings = storageManager ? storageManager.getSettings() : {};
  const logPath = `${settings.storagePath || '~/Documents/TimeHarbor/'}/logs/activity_log.html`;
  
  // Use native messaging to open the log file
  chrome.runtime.sendNativeMessage('com.timeharbor.extension', {
    action: 'openFile',
    path: logPath
  }, (response) => {
    if (!response || !response.success) {
      console.error('Failed to open activity log');
      showNotification('Error', 'Could not open activity log');
    }
  });
}

/**
 * Show notification to user
 */
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/timeharbor-48.png',
    title: title,
    message: message
  });
}

/**
 * Update extension badge with current mode
 */
function updateBadgeWithMode() {
  if (!storageManager) return;
  
  const mode = storageManager.getStorageMode();
  const badges = {
    'local': '💾',
    'server': '☁️',
    'both': '📦'
  };
  
  chrome.browserAction.setBadgeText({ text: badges[mode] || '' });
}

// Initialize extension when background script loads
initializeExtension();