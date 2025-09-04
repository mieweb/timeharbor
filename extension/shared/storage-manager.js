/**
 * TimeHarbor Storage Manager
 * Handles three storage modes: Local Only, Server Only, Both
 */

class TimeHarborStorageManager {
  constructor() {
    this.storageMode = 'local'; // 'local', 'server', 'both'
    this.settings = {
      serverUrl: 'https://localhost:3000',
      storagePath: '~/Documents/TimeHarbor/',
      authToken: null,
      autoSync: true,
      imageQuality: 0.8
    };
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    
    this.initializeSettings();
    this.setupEventListeners();
  }

  /**
   * Initialize settings from browser storage
   */
  async initializeSettings() {
    try {
      const stored = await this.getBrowserStorage(['storageMode', 'settings']);
      if (stored.storageMode) {
        this.storageMode = stored.storageMode;
      }
      if (stored.settings) {
        this.settings = { ...this.settings, ...stored.settings };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  /**
   * Set up event listeners for online/offline status
   */
  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Capture and store screenshot based on current storage mode
   */
  async captureAndStore(tabInfo) {
    const timestamp = new Date().toISOString();
    const captureId = this.generateCaptureId(timestamp);
    
    try {
      // Capture screenshot
      const screenshot = await this.captureScreenshot();
      
      // Extract metadata
      const metadata = {
        id: captureId,
        timestamp: timestamp,
        url: tabInfo.url,
        title: tabInfo.title,
        favicon: tabInfo.favIconUrl,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        mode: this.storageMode
      };

      // Process based on storage mode
      const result = await this.processCapture(screenshot, metadata);
      
      // Update HTML activity log for local modes
      if (this.storageMode === 'local' || this.storageMode === 'both') {
        await this.updateActivityLog(metadata, result.localPath);
      }

      return result;
    } catch (error) {
      console.error('Capture failed:', error);
      throw error;
    }
  }

  /**
   * Process capture based on storage mode
   */
  async processCapture(screenshot, metadata) {
    const result = {
      success: false,
      localPath: null,
      serverUrl: null,
      error: null
    };

    try {
      switch (this.storageMode) {
        case 'local':
          result.localPath = await this.saveLocal(screenshot, metadata);
          result.success = true;
          break;
          
        case 'server':
          if (this.isOnline) {
            result.serverUrl = await this.uploadToServer(screenshot, metadata);
            result.success = true;
          } else {
            await this.queueForSync(screenshot, metadata);
            result.success = true;
            result.queued = true;
          }
          break;
          
        case 'both':
          // Save locally first
          result.localPath = await this.saveLocal(screenshot, metadata);
          
          // Then upload to server
          if (this.isOnline) {
            try {
              result.serverUrl = await this.uploadToServer(screenshot, metadata);
            } catch (error) {
              console.warn('Server upload failed, queued for sync:', error);
              await this.queueForSync(screenshot, metadata);
            }
          } else {
            await this.queueForSync(screenshot, metadata);
          }
          result.success = true;
          break;
      }
    } catch (error) {
      result.error = error.message;
      throw error;
    }

    return result;
  }

  /**
   * Capture screenshot of current tab
   */
  async captureScreenshot() {
    return new Promise((resolve, reject) => {
      // Use Safari's native screenshot API via native messaging
      chrome.runtime.sendNativeMessage('com.timeharbor.extension', {
        action: 'captureScreenshot',
        quality: this.settings.imageQuality
      }, (response) => {
        if (response && response.screenshot) {
          resolve(response.screenshot);
        } else {
          reject(new Error('Failed to capture screenshot'));
        }
      });
    });
  }

  /**
   * Save screenshot locally via native messaging
   */
  async saveLocal(screenshot, metadata) {
    return new Promise((resolve, reject) => {
      const dateFolder = this.formatDatePath(metadata.timestamp);
      const filename = `capture_${this.formatFilename(metadata.timestamp)}_${metadata.id.slice(-3)}.png`;
      
      chrome.runtime.sendNativeMessage('com.timeharbor.extension', {
        action: 'saveLocal',
        screenshot: screenshot,
        metadata: metadata,
        path: `${this.settings.storagePath}/captures/${dateFolder}/${filename}`,
        metadataPath: `${this.settings.storagePath}/captures/${dateFolder}/${filename.replace('.png', '.json')}`
      }, (response) => {
        if (response && response.success) {
          resolve(response.path);
        } else {
          reject(new Error('Failed to save locally'));
        }
      });
    });
  }

  /**
   * Upload screenshot to TimeHarbor server
   */
  async uploadToServer(screenshot, metadata) {
    const formData = new FormData();
    
    // Convert base64 to blob
    const blob = this.base64ToBlob(screenshot, 'image/png');
    formData.append('screenshot', blob, `${metadata.id}.png`);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(`${this.settings.serverUrl}/api/captures`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.settings.authToken}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Server upload failed: ${response.status}`);
    }

    const result = await response.json();
    return result.url;
  }

  /**
   * Queue capture for later sync
   */
  async queueForSync(screenshot, metadata) {
    this.syncQueue.push({ screenshot, metadata, timestamp: Date.now() });
    await this.saveSyncQueue();
  }

  /**
   * Process queued items when online
   */
  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of queue) {
      try {
        await this.uploadToServer(item.screenshot, item.metadata);
        console.log('Synced queued capture:', item.metadata.id);
      } catch (error) {
        console.error('Failed to sync queued capture:', error);
        this.syncQueue.push(item); // Re-queue failed items
      }
    }

    await this.saveSyncQueue();
  }

  /**
   * Update HTML activity log
   */
  async updateActivityLog(metadata, localPath) {
    const logEntry = {
      ...metadata,
      screenshotPath: localPath,
      status: {
        local: localPath ? 'saved' : 'failed',
        server: this.storageMode === 'server' || this.storageMode === 'both' ? 
                (this.isOnline ? 'synced' : 'pending') : 'n/a'
      }
    };

    // Send to native app to update HTML log
    chrome.runtime.sendNativeMessage('com.timeharbor.extension', {
      action: 'updateActivityLog',
      entry: logEntry,
      logPath: `${this.settings.storagePath}/logs/activity_log.html`
    });
  }

  /**
   * Storage mode management
   */
  async setStorageMode(mode) {
    if (!['local', 'server', 'both'].includes(mode)) {
      throw new Error('Invalid storage mode');
    }
    
    this.storageMode = mode;
    await this.setBrowserStorage({ storageMode: mode });
  }

  getStorageMode() {
    return this.storageMode;
  }

  /**
   * Settings management
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.setBrowserStorage({ settings: this.settings });
  }

  getSettings() {
    return { ...this.settings };
  }

  /**
   * Utility methods
   */
  generateCaptureId(timestamp) {
    return `capture_${timestamp.replace(/[:.]/g, '')}_${Math.random().toString(36).substr(2, 3)}`;
  }

  formatDatePath(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }

  formatFilename(timestamp) {
    return timestamp.replace(/[:.]/g, '').replace('T', '_').replace('Z', '');
  }

  base64ToBlob(base64, contentType) {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }

  async getBrowserStorage(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  async setBrowserStorage(items) {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, resolve);
    });
  }

  async saveSyncQueue() {
    await this.setBrowserStorage({ syncQueue: this.syncQueue });
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.TimeHarborStorageManager = TimeHarborStorageManager;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeHarborStorageManager;
}