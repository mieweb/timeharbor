/**
 * Ozwell Chat Widget - Draggable Wrapper
 * Provides floating button and draggable chat window
 */

class ChatWrapper {
  constructor() {
    this.isOpen = false;
    this.isMinimized = false;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.currentPosition = { x: 0, y: 0 };
    this.rafId = null;

    this.init();
  }

  init() {
    // Immediately hide any auto-created Ozwell iframes (they load before our wrapper)
    this.hideAutoCreatedOzwellIframes();

    // Only create widget if user is logged in (Meteor specific check)
    if (typeof Meteor !== 'undefined' && !Meteor.userId()) {
      // User not logged in, don't create widget
      // Check again when user logs in
      const checkLogin = setInterval(() => {
        if (Meteor.userId()) {
          clearInterval(checkLogin);
          this.createElements();
          this.attachEventListeners();
        }
      }, 500);
      return;
    }

    this.createElements();
    this.attachEventListeners();
  }

  hideAutoCreatedOzwellIframes() {
    // Watch for Ozwell iframes being created and hide them temporarily
    const hideIframeIfNotInContainer = (iframe) => {
      // Only hide if it's not already in our container
      if (!iframe.closest('#ozwell-chat-content')) {
        iframe.style.visibility = 'hidden';
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
      }
    };

    // Check for existing iframes
    const checkExisting = () => {
      const iframes = document.querySelectorAll('iframe[src*="widget.html"]');
      iframes.forEach(hideIframeIfNotInContainer);
    };

    // Initial check
    checkExisting();

    // Watch for new iframes (but only run once per iframe)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'IFRAME' && node.src && node.src.includes('widget.html')) {
            hideIframeIfNotInContainer(node);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    this.iframeObserver = observer;
  }

  createElements() {
    // Create floating button
    this.button = document.createElement('button');
    this.button.id = 'ozwell-chat-button';
    this.button.innerHTML = '💬';
    this.button.title = 'Open TimeHarbor Assistant';
    document.body.appendChild(this.button);

    // Create chat container
    this.container = document.createElement('div');
    this.container.id = 'ozwell-chat-container';
    this.container.innerHTML = `
      <div id="ozwell-chat-header">
        <h3>TimeHarbor Assistant</h3>
        <div id="ozwell-chat-controls">
          <button id="ozwell-minimize-btn" title="Minimize">−</button>
          <button id="ozwell-close-btn" title="Close">×</button>
        </div>
      </div>
      <div id="ozwell-chat-content">
        <!-- Ozwell widget iframe will be injected here -->
      </div>
    `;
    document.body.appendChild(this.container);

    // Store references
    this.header = document.getElementById('ozwell-chat-header');
    this.content = document.getElementById('ozwell-chat-content');
    this.minimizeBtn = document.getElementById('ozwell-minimize-btn');
    this.closeBtn = document.getElementById('ozwell-close-btn');
  }

  attachEventListeners() {
    // Button click - toggle open/close
    this.button.addEventListener('click', () => this.toggle());

    // Header drag functionality
    this.header.addEventListener('mousedown', (e) => this.startDrag(e));
    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.stopDrag());

    // Control buttons
    this.minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    this.closeBtn.addEventListener('click', () => this.close());

    // Prevent text selection while dragging
    this.header.addEventListener('selectstart', (e) => e.preventDefault());
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.container.classList.add('open');
    this.button.classList.add('hidden');

    // Load Ozwell widget if configured
    this.loadWidget();
  }

  close() {
    this.isOpen = false;
    this.isMinimized = false;
    this.container.classList.remove('open', 'minimized');
    this.button.classList.remove('hidden');
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    if (this.isMinimized) {
      this.container.classList.add('minimized');
      this.minimizeBtn.innerHTML = '□';
      this.minimizeBtn.title = 'Maximize';
    } else {
      this.container.classList.remove('minimized');
      this.minimizeBtn.innerHTML = '−';
      this.minimizeBtn.title = 'Minimize';
    }
  }

  startDrag(e) {
    if (e.target.closest('button')) return; // Don't drag when clicking buttons

    this.isDragging = true;
    this.container.classList.add('dragging');

    // Cache container dimensions (they don't change during drag)
    this.containerWidth = this.container.offsetWidth;
    this.containerHeight = this.container.offsetHeight;

    const rect = this.container.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;

    // Store current absolute position (where it actually is on screen)
    this.currentPosition.x = rect.left;
    this.currentPosition.y = rect.top;

    // Remove bottom/right positioning to prevent conflicts with transform
    this.container.style.bottom = 'auto';
    this.container.style.right = 'auto';
    this.container.style.left = '0';
    this.container.style.top = '0';
  }

  drag(e) {
    if (!this.isDragging) return;

    e.preventDefault();

    // Just store the mouse position, don't update DOM yet
    const newX = e.clientX - this.dragOffset.x;
    const newY = e.clientY - this.dragOffset.y;

    // Keep within viewport bounds (use cached dimensions)
    const maxX = window.innerWidth - this.containerWidth;
    const maxY = window.innerHeight - this.containerHeight;

    this.currentPosition.x = Math.max(0, Math.min(newX, maxX));
    this.currentPosition.y = Math.max(0, Math.min(newY, maxY));

    // Request animation frame for smooth updates
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.updatePosition());
    }
  }

  updatePosition() {
    // Update DOM only once per frame using transform (GPU accelerated)
    this.container.style.transform = `translate(${this.currentPosition.x}px, ${this.currentPosition.y}px)`;
    this.rafId = null;
  }

  stopDrag() {
    if (this.isDragging) {
      this.isDragging = false;
      this.container.classList.remove('dragging');

      // Cancel any pending animation frame
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  loadWidget() {
    // Check if Ozwell widget is configured
    if (!window.OzwellChatConfig) {
      console.warn('OzwellChatConfig not found. Widget will not load.');
      this.content.innerHTML = '<div style="padding: 20px; text-align: center;">Chat widget configuration missing.</div>';
      return;
    }

    // Check if widget already loaded
    if (this.content.querySelector('iframe')) {
      return;
    }

    // Wait for Ozwell embed script to load
    const waitForOzwell = setInterval(() => {
      if (window.OzwellChat && window.OzwellChat.iframe) {
        clearInterval(waitForOzwell);

        // Get the Ozwell iframe
        const ozwellIframe = window.OzwellChat.iframe;

        // Remove from its current location
        if (ozwellIframe.parentElement && ozwellIframe.parentElement !== this.content) {
          ozwellIframe.remove();
        }

        // Move Ozwell iframe into our container
        this.content.appendChild(ozwellIframe);

        // IMPORTANT: Reset all styles to make it visible in our container
        ozwellIframe.style.width = '100%';
        ozwellIframe.style.height = '100%';
        ozwellIframe.style.border = 'none';
        ozwellIframe.style.display = 'block';
        ozwellIframe.style.visibility = 'visible';
        ozwellIframe.style.position = 'relative';
        ozwellIframe.style.left = '0';
        ozwellIframe.style.top = '0';

        console.log('Ozwell widget loaded successfully');
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(waitForOzwell);
      if (!this.content.querySelector('iframe')) {
        console.error('Ozwell widget failed to load');
        this.content.innerHTML = '<div style="padding: 20px; text-align: center;">Failed to load chat widget. Please refresh.</div>';
      }
    }, 5000);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.chatWrapper = new ChatWrapper();
  });
} else {
  window.chatWrapper = new ChatWrapper();
}
