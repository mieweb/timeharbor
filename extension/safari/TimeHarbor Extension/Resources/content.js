/**
 * TimeHarbor Content Script
 * Runs in the context of web pages to assist with screenshot capture
 */

class TimeHarborContentScript {
  constructor() {
    this.setupMessageListener();
    this.setupKeyboardShortcuts();
    this.injectStyles();
  }

  /**
   * Set up message listener for communication with background script
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'prepareCapture':
          this.preparePageForCapture()
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // Indicates async response

        case 'extractMetadata':
          const metadata = this.extractPageMetadata();
          sendResponse({ success: true, metadata });
          break;

        case 'highlightCaptureArea':
          this.highlightCaptureArea(message.area);
          sendResponse({ success: true });
          break;

        case 'removeCaptureHighlight':
          this.removeCaptureHighlight();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  /**
   * Set up keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Cmd+Shift+H (Mac) or Ctrl+Shift+H (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'H') {
        event.preventDefault();
        this.triggerCapture();
      }
    });
  }

  /**
   * Inject styles for TimeHarbor overlay elements
   */
  injectStyles() {
    if (document.getElementById('timeharbor-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'timeharbor-styles';
    styles.textContent = `
      .timeharbor-capture-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(52, 152, 219, 0.1);
        border: 3px solid #3498db;
        box-sizing: border-box;
        z-index: 999999;
        pointer-events: none;
        animation: timeharbor-pulse 1s ease-in-out infinite alternate;
      }

      @keyframes timeharbor-pulse {
        from { opacity: 0.3; }
        to { opacity: 0.7; }
      }

      .timeharbor-capture-indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3498db;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        z-index: 1000000;
        pointer-events: none;
        animation: timeharbor-slide-in 0.3s ease-out;
      }

      @keyframes timeharbor-slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .timeharbor-preparing {
        cursor: wait !important;
      }

      .timeharbor-preparing * {
        cursor: wait !important;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Trigger capture from content script
   */
  async triggerCapture() {
    try {
      // Send message to background script to initiate capture
      const response = await this.sendMessageToBackground({
        action: 'captureTab'
      });

      if (response.success) {
        this.showCaptureSuccess();
      } else {
        this.showCaptureError(response.error);
      }
    } catch (error) {
      console.error('Failed to trigger capture:', error);
      this.showCaptureError(error.message);
    }
  }

  /**
   * Prepare page for screenshot capture
   */
  async preparePageForCapture() {
    return new Promise((resolve) => {
      // Add preparing class to body
      document.body.classList.add('timeharbor-preparing');

      // Show capture indicator
      this.showCaptureIndicator('Preparing capture...');

      // Scroll to top for consistent capture
      window.scrollTo(0, 0);

      // Wait for scroll to complete and any dynamic content to load
      setTimeout(() => {
        // Remove any sticky/fixed elements that might interfere
        this.temporarilyHideProblematicElements();

        // Resolve with page information
        resolve({
          scrollPosition: { x: window.scrollX, y: window.scrollY },
          viewportSize: { width: window.innerWidth, height: window.innerHeight },
          documentSize: { 
            width: document.documentElement.scrollWidth, 
            height: document.documentElement.scrollHeight 
          },
          timestamp: new Date().toISOString()
        });
      }, 500);
    });
  }

  /**
   * Extract metadata from current page
   */
  extractPageMetadata() {
    const metadata = {
      title: document.title,
      url: window.location.href,
      description: '',
      keywords: '',
      author: '',
      canonical: '',
      ogImage: '',
      ogTitle: '',
      ogDescription: '',
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      language: document.documentElement.lang || navigator.language
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
          case 'og:title':
            metadata.ogTitle = content;
            break;
          case 'og:description':
            metadata.ogDescription = content;
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

    // Get favicon
    const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
    if (favicon) {
      metadata.favicon = favicon.href;
    } else {
      // Try default favicon location
      metadata.favicon = `${window.location.origin}/favicon.ico`;
    }

    return metadata;
  }

  /**
   * Highlight capture area (for future full-page capture visualization)
   */
  highlightCaptureArea(area) {
    this.removeCaptureHighlight();

    const overlay = document.createElement('div');
    overlay.id = 'timeharbor-capture-overlay';
    overlay.className = 'timeharbor-capture-overlay';
    
    if (area) {
      overlay.style.top = area.top + 'px';
      overlay.style.left = area.left + 'px';
      overlay.style.width = area.width + 'px';
      overlay.style.height = area.height + 'px';
    }

    document.body.appendChild(overlay);

    // Remove after 2 seconds
    setTimeout(() => this.removeCaptureHighlight(), 2000);
  }

  /**
   * Remove capture highlight overlay
   */
  removeCaptureHighlight() {
    const overlay = document.getElementById('timeharbor-capture-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Show capture indicator
   */
  showCaptureIndicator(message) {
    this.removeCaptureIndicator();

    const indicator = document.createElement('div');
    indicator.id = 'timeharbor-capture-indicator';
    indicator.className = 'timeharbor-capture-indicator';
    indicator.textContent = message;

    document.body.appendChild(indicator);
  }

  /**
   * Remove capture indicator
   */
  removeCaptureIndicator() {
    const indicator = document.getElementById('timeharbor-capture-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Show capture success feedback
   */
  showCaptureSuccess() {
    document.body.classList.remove('timeharbor-preparing');
    this.showCaptureIndicator('📸 Screenshot captured!');
    
    setTimeout(() => {
      this.removeCaptureIndicator();
    }, 2000);
  }

  /**
   * Show capture error feedback
   */
  showCaptureError(error) {
    document.body.classList.remove('timeharbor-preparing');
    this.showCaptureIndicator('❌ Capture failed: ' + error);
    
    setTimeout(() => {
      this.removeCaptureIndicator();
    }, 3000);
  }

  /**
   * Temporarily hide elements that might interfere with capture
   */
  temporarilyHideProblematicElements() {
    // Store original display values
    this.hiddenElements = [];

    // Hide common problematic elements
    const problematicSelectors = [
      '[style*="position: fixed"]',
      '[style*="position:fixed"]',
      '.cookie-banner',
      '.cookie-notice',
      '.gdpr-banner',
      '#cookie-notice',
      '.newsletter-popup',
      '.modal-backdrop',
      '.overlay'
    ];

    problematicSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.offsetParent !== null) { // Only if visible
          this.hiddenElements.push({
            element: el,
            originalDisplay: el.style.display
          });
          el.style.display = 'none';
        }
      });
    });

    // Restore elements after a delay
    setTimeout(() => {
      this.restoreHiddenElements();
    }, 3000);
  }

  /**
   * Restore previously hidden elements
   */
  restoreHiddenElements() {
    if (this.hiddenElements) {
      this.hiddenElements.forEach(({ element, originalDisplay }) => {
        element.style.display = originalDisplay;
      });
      this.hiddenElements = [];
    }
  }

  /**
   * Send message to background script
   */
  sendMessageToBackground(message) {
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

  /**
   * Get page performance metrics (for debugging)
   */
  getPageMetrics() {
    if (!window.performance) return null;

    return {
      loadTime: window.performance.timing.loadEventEnd - window.performance.timing.navigationStart,
      domContentLoaded: window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart,
      resources: window.performance.getEntriesByType('resource').length,
      memory: window.performance.memory ? {
        used: window.performance.memory.usedJSHeapSize,
        total: window.performance.memory.totalJSHeapSize,
        limit: window.performance.memory.jsHeapSizeLimit
      } : null
    };
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TimeHarborContentScript();
  });
} else {
  new TimeHarborContentScript();
}