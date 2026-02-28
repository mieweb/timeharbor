/**
 * TimeHarbor Screenshot Handler
 * Handles screenshot capture and processing
 */

class ScreenshotHandler {
  constructor() {
    this.capturing = false;
    this.quality = 0.8;
    this.format = 'png';
  }

  /**
   * Capture screenshot of current tab
   */
  async captureTab() {
    if (this.capturing) {
      throw new Error('Screenshot capture already in progress');
    }

    this.capturing = true;

    try {
      // Get current tab info
      const tabInfo = await this.getCurrentTabInfo();
      
      // Capture screenshot using Safari's API
      const screenshot = await this.captureScreenshot();
      
      // Process and optimize image
      const processedScreenshot = await this.processScreenshot(screenshot);
      
      return {
        screenshot: processedScreenshot,
        tabInfo: tabInfo,
        timestamp: new Date().toISOString()
      };
    } finally {
      this.capturing = false;
    }
  }

  /**
   * Get current tab information
   */
  async getCurrentTabInfo() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!tabs || tabs.length === 0) {
          reject(new Error('No active tab found'));
          return;
        }

        const tab = tabs[0];
        resolve({
          id: tab.id,
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl,
          windowId: tab.windowId,
          index: tab.index
        });
      });
    });
  }

  /**
   * Capture screenshot using browser API
   */
  async captureScreenshot() {
    return new Promise((resolve, reject) => {
      // For Safari extension, use native messaging for full page capture
      chrome.runtime.sendNativeMessage('com.timeharbor.extension', {
        action: 'captureScreenshot',
        quality: this.quality,
        format: this.format,
        fullPage: true
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response && response.screenshot) {
          resolve(response.screenshot);
        } else {
          reject(new Error('Failed to capture screenshot'));
        }
      });
    });
  }

  /**
   * Fallback to browser captureVisibleTab API
   */
  async captureVisibleTab() {
    return new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(null, {
        format: this.format,
        quality: Math.round(this.quality * 100)
      }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (dataUrl) {
          resolve(dataUrl);
        } else {
          reject(new Error('Failed to capture visible tab'));
        }
      });
    });
  }

  /**
   * Process and optimize screenshot
   */
  async processScreenshot(screenshot) {
    // If screenshot is already optimized, return as-is
    if (typeof screenshot === 'string' && screenshot.startsWith('data:image')) {
      return screenshot;
    }

    // Convert to canvas for processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          // Set canvas dimensions
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw image to canvas
          ctx.drawImage(img, 0, 0);

          // Convert to optimized data URL
          const optimizedDataUrl = canvas.toDataURL(`image/${this.format}`, this.quality);
          resolve(optimizedDataUrl);
        } catch (error) {
          reject(new Error(`Failed to process screenshot: ${error.message}`));
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load screenshot for processing'));
      };

      img.src = screenshot;
    });
  }

  /**
   * Extract metadata from current page
   */
  async extractPageMetadata(tabInfo) {
    return new Promise((resolve) => {
      // Execute script in content script context to get page metadata
      chrome.tabs.executeScript(tabInfo.id, {
        code: `
          (function() {
            // Get page metadata
            const metadata = {
              title: document.title,
              description: '',
              keywords: '',
              author: '',
              canonical: '',
              ogImage: '',
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                scrollWidth: document.documentElement.scrollWidth,
                scrollHeight: document.documentElement.scrollHeight
              },
              timestamp: new Date().toISOString()
            };

            // Extract meta tags
            const metaTags = document.querySelectorAll('meta');
            metaTags.forEach(tag => {
              const name = tag.getAttribute('name') || tag.getAttribute('property');
              const content = tag.getAttribute('content');
              
              if (name && content) {
                switch (name.toLowerCase()) {
                  case 'description':
                    metadata.description = content;
                    break;
                  case 'keywords':
                    metadata.keywords = content;
                    break;
                  case 'author':
                    metadata.author = content;
                    break;
                  case 'og:image':
                    metadata.ogImage = content;
                    break;
                }
              }
            });

            // Get canonical URL
            const canonical = document.querySelector('link[rel="canonical"]');
            if (canonical) {
              metadata.canonical = canonical.href;
            }

            return metadata;
          })();
        `
      }, (results) => {
        if (chrome.runtime.lastError || !results || !results[0]) {
          // Fallback metadata
          resolve({
            title: tabInfo.title,
            description: '',
            keywords: '',
            author: '',
            canonical: tabInfo.url,
            ogImage: '',
            viewport: {
              width: 1920,
              height: 1080,
              scrollWidth: 1920,
              scrollHeight: 1080
            },
            timestamp: new Date().toISOString()
          });
        } else {
          resolve(results[0]);
        }
      });
    });
  }

  /**
   * Capture full page screenshot with scrolling
   */
  async captureFullPage(tabInfo) {
    return new Promise((resolve, reject) => {
      // Use native messaging for full page capture
      chrome.runtime.sendNativeMessage('com.timeharbor.extension', {
        action: 'captureFullPage',
        tabId: tabInfo.id,
        quality: this.quality,
        format: this.format
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response && response.screenshot) {
          resolve(response.screenshot);
        } else {
          reject(new Error('Failed to capture full page screenshot'));
        }
      });
    });
  }

  /**
   * Close tab after capture (if configured)
   */
  async closeTabAfterCapture(tabId, delay = 1000) {
    setTimeout(() => {
      chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
          console.warn('Failed to close tab:', chrome.runtime.lastError.message);
        }
      });
    }, delay);
  }

  /**
   * Set screenshot quality (0.1 to 1.0)
   */
  setQuality(quality) {
    if (quality < 0.1 || quality > 1.0) {
      throw new Error('Quality must be between 0.1 and 1.0');
    }
    this.quality = quality;
  }

  /**
   * Set screenshot format
   */
  setFormat(format) {
    if (!['png', 'jpeg'].includes(format)) {
      throw new Error('Format must be png or jpeg');
    }
    this.format = format;
  }

  /**
   * Get screenshot dimensions and file size
   */
  getScreenshotInfo(screenshot) {
    if (typeof screenshot !== 'string' || !screenshot.startsWith('data:image')) {
      return null;
    }

    // Extract base64 data
    const base64Data = screenshot.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = binaryString.length;

    // Estimate dimensions (this is approximate)
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          fileSize: bytes,
          fileSizeFormatted: this.formatFileSize(bytes),
          format: this.format,
          quality: this.quality
        });
      };

      img.onerror = () => {
        resolve({
          width: 0,
          height: 0,
          fileSize: bytes,
          fileSizeFormatted: this.formatFileSize(bytes),
          format: this.format,
          quality: this.quality
        });
      };

      img.src = screenshot;
    });
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if tab is capturable
   */
  isTabCapturable(tabInfo) {
    // Check for restricted URLs
    const restrictedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'safari-extension:'];
    const restrictedUrls = ['chrome://newtab', 'about:blank', 'edge://newtab'];
    
    if (!tabInfo.url) return false;
    
    for (const protocol of restrictedProtocols) {
      if (tabInfo.url.startsWith(protocol)) return false;
    }
    
    for (const url of restrictedUrls) {
      if (tabInfo.url === url) return false;
    }
    
    return true;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ScreenshotHandler = ScreenshotHandler;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenshotHandler;
}