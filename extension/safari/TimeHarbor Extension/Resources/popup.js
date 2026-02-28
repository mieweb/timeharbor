/**
 * TimeHarbor Popup Script
 * Handles popup interface interactions and state management
 */

class TimeHarborPopup {
  constructor() {
    this.isCapturing = false;
    this.currentTab = null;
    this.extensionStatus = null;
    
    this.initializeElements();
    this.setupEventListeners();
    this.loadCurrentState();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    // Status elements
    this.statusDot = document.getElementById('statusDot');
    this.statusText = document.getElementById('statusText');
    
    // Main action elements
    this.captureBtn = document.getElementById('captureBtn');
    this.captureInfo = document.getElementById('captureInfo');
    
    // Storage mode elements
    this.modeRadios = document.querySelectorAll('input[name="storageMode"]');
    
    // Quick action elements
    this.openLogBtn = document.getElementById('openLogBtn');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.syncBtn = document.getElementById('syncBtn');
    
    // Server section elements
    this.serverSection = document.getElementById('serverSection');
    this.connectionDot = document.getElementById('connectionDot');
    this.connectionText = document.getElementById('connectionText');
    this.testConnectionBtn = document.getElementById('testConnectionBtn');
    
    // Tab info elements
    this.tabUrl = document.getElementById('tabUrl');
    this.tabTitle = document.getElementById('tabTitle');
    
    // Loading overlay
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Main capture button
    this.captureBtn.addEventListener('click', () => this.handleCapture());
    
    // Storage mode selection
    this.modeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => this.handleModeChange(e.target.value));
    });
    
    // Quick action buttons
    this.openLogBtn.addEventListener('click', () => this.openActivityLog());
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.syncBtn.addEventListener('click', () => this.processSyncQueue());
    
    // Server connection test
    this.testConnectionBtn.addEventListener('click', () => this.testConnection());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  /**
   * Load current extension state
   */
  async loadCurrentState() {
    try {
      // Get extension status
      const status = await this.sendMessage({ action: 'getStatus' });
      this.extensionStatus = status;
      
      // Update UI based on status
      this.updateStatusIndicator(status);
      this.updateStorageMode(status.storageMode);
      this.updateServerSection(status.storageMode, status.settings);
      
      // Get current tab info
      await this.loadCurrentTab();
      
      // Test server connection if in server mode
      if (status.storageMode === 'server' || status.storageMode === 'both') {
        this.testConnection();
      }
      
    } catch (error) {
      console.error('Failed to load extension state:', error);
      this.updateStatusIndicator({ initialized: false });
    }
  }

  /**
   * Load current tab information
   */
  async loadCurrentTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          this.currentTab = tabs[0];
          this.updateTabInfo(this.currentTab);
          resolve(this.currentTab);
        } else {
          this.tabUrl.textContent = 'No active tab';
          this.tabTitle.textContent = '';
          resolve(null);
        }
      });
    });
  }

  /**
   * Handle capture button click
   */
  async handleCapture() {
    if (this.isCapturing) return;
    
    try {
      this.isCapturing = true;
      this.showLoading('Capturing screenshot...');
      
      // Send capture request to background script
      const result = await this.sendMessage({ action: 'captureTab' });
      
      if (result.success) {
        this.showSuccess('Screenshot captured successfully!');
        this.updateCaptureInfo(`Saved in ${result.result.mode} mode`);
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Capture failed:', error);
      this.showError('Capture failed: ' + error.message);
    } finally {
      this.isCapturing = false;
      this.hideLoading();
    }
  }

  /**
   * Handle storage mode change
   */
  async handleModeChange(mode) {
    try {
      const result = await this.sendMessage({ 
        action: 'setStorageMode', 
        mode: mode 
      });
      
      if (result.success) {
        this.updateServerSection(mode, this.extensionStatus?.settings);
        this.updateCaptureInfo(`Mode changed to ${mode}`);
        
        // Test connection if switching to server mode
        if (mode === 'server' || mode === 'both') {
          setTimeout(() => this.testConnection(), 500);
        }
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Failed to change storage mode:', error);
      this.showError('Failed to change mode: ' + error.message);
      // Revert radio selection
      this.loadCurrentState();
    }
  }

  /**
   * Open activity log
   */
  async openActivityLog() {
    try {
      const result = await this.sendMessage({ action: 'openActivityLog' });
      if (result.success) {
        window.close(); // Close popup after opening log
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to open activity log:', error);
      this.showError('Failed to open activity log');
    }
  }

  /**
   * Open settings (placeholder)
   */
  openSettings() {
    // For now, just show a message
    // In a full implementation, this would open a settings page
    alert('Settings panel will be implemented in the next phase');
  }

  /**
   * Process sync queue
   */
  async processSyncQueue() {
    try {
      this.showLoading('Syncing queued captures...');
      
      const result = await this.sendMessage({ action: 'processSyncQueue' });
      
      if (result.success) {
        this.showSuccess('Sync queue processed');
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Failed to process sync queue:', error);
      this.showError('Sync failed: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Test server connection
   */
  async testConnection() {
    try {
      this.connectionText.textContent = 'Testing...';
      this.connectionDot.className = 'connection-dot';
      
      const result = await this.sendMessage({ action: 'testConnection' });
      
      if (result.success) {
        this.connectionText.textContent = 'Connected';
        this.connectionDot.className = 'connection-dot online';
      } else {
        this.connectionText.textContent = 'Failed';
        this.connectionDot.className = 'connection-dot offline';
      }
      
    } catch (error) {
      console.error('Connection test failed:', error);
      this.connectionText.textContent = 'Error';
      this.connectionDot.className = 'connection-dot offline';
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeydown(event) {
    if (event.key === 'Enter' && event.target === this.captureBtn) {
      this.handleCapture();
    } else if (event.key === 'Escape') {
      window.close();
    }
  }

  /**
   * UI Update Methods
   */

  updateStatusIndicator(status) {
    if (status.initialized) {
      this.statusDot.className = 'status-dot';
      this.statusText.textContent = 'Ready';
      this.captureBtn.disabled = false;
    } else {
      this.statusDot.className = 'status-dot error';
      this.statusText.textContent = 'Error';
      this.captureBtn.disabled = true;
    }
  }

  updateStorageMode(mode) {
    this.modeRadios.forEach(radio => {
      radio.checked = radio.value === mode;
    });
  }

  updateServerSection(mode, settings) {
    const showServer = mode === 'server' || mode === 'both';
    this.serverSection.style.display = showServer ? 'block' : 'none';
    
    if (showServer && settings) {
      // Update server URL display if needed
      // This could be expanded to show more server info
    }
  }

  updateTabInfo(tab) {
    if (tab) {
      this.tabUrl.textContent = tab.url;
      this.tabTitle.textContent = tab.title;
      
      // Check if tab is capturable
      const capturable = this.isTabCapturable(tab);
      this.captureBtn.disabled = !capturable || this.isCapturing;
      
      if (!capturable) {
        this.updateCaptureInfo('This page cannot be captured');
      } else {
        this.updateCaptureInfo('Click to capture current tab screenshot');
      }
    }
  }

  updateCaptureInfo(message) {
    this.captureInfo.textContent = message;
  }

  /**
   * Loading and feedback methods
   */

  showLoading(message) {
    this.loadingText.textContent = message;
    this.loadingOverlay.style.display = 'flex';
    this.captureBtn.disabled = true;
  }

  hideLoading() {
    this.loadingOverlay.style.display = 'none';
    this.captureBtn.disabled = false;
  }

  showSuccess(message) {
    document.body.classList.add('success');
    this.updateCaptureInfo(message);
    
    setTimeout(() => {
      document.body.classList.remove('success');
    }, 2000);
  }

  showError(message) {
    document.body.classList.add('error');
    this.updateCaptureInfo(message);
    
    setTimeout(() => {
      document.body.classList.remove('error');
      this.updateCaptureInfo('Click to capture current tab screenshot');
    }, 3000);
  }

  /**
   * Utility methods
   */

  isTabCapturable(tab) {
    if (!tab || !tab.url) return false;
    
    const restrictedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'safari-extension:'];
    const restrictedUrls = ['chrome://newtab', 'about:blank', 'edge://newtab'];
    
    for (const protocol of restrictedProtocols) {
      if (tab.url.startsWith(protocol)) return false;
    }
    
    for (const url of restrictedUrls) {
      if (tab.url === url) return false;
    }
    
    return true;
  }

  /**
   * Send message to background script
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TimeHarborPopup();
});