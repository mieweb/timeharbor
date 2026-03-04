
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import QRCode from 'qrcode';
import './PulseUpload.html';

// App Store URL for PulseCam
const PULSECAM_APP_STORE_URL = 'https://apps.apple.com/us/app/pulse-cam/id6748621024';

// Reactive state for the pulse upload modal
const pulseUploadState = {
  loading: new ReactiveVar(false),
  error: new ReactiveVar(null),
  data: new ReactiveVar(null),
  ticketId: new ReactiveVar(null),
  ticketTitle: new ReactiveVar(null)
};

/**
 * Check if running on mobile device
 */
function isMobileDevice() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
         (typeof Meteor !== 'undefined' && Meteor.isCordova);
}

/**
 * Try to open PulseCam app with deeplink, fallback to App Store if not installed
 * @param {String} deeplink - The pulsecam:// deep link URL
 */
function openPulseCamOrAppStore(deeplink) {
  // Track if we successfully opened the app
  let appOpened = false;
  
  // Listen for visibility change - if page becomes hidden, app was opened
  const handleVisibilityChange = () => {
    if (document.hidden) {
      appOpened = true;
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Try to open the app via deep link
  window.location.href = deeplink;
  
  // If app doesn't open within 1.5 seconds, redirect to App Store
  setTimeout(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    
    if (!appOpened && !document.hidden) {
      // App didn't open, redirect to App Store
      window.location.href = PULSECAM_APP_STORE_URL;
    }
  }, 1500);
}

/**
 * Open PulseCam directly for a ticket (single-click on mobile)
 * On desktop, shows modal with QR code
 * @param {String} ticketId - The ticket ID
 * @param {String} ticketTitle - The ticket title for display
 */
export function openPulseUploadForTicket(ticketId, ticketTitle) {
  // On mobile: try to open app directly, fallback to App Store
  if (isMobileDevice()) {
    // Show brief loading indicator
    const loadingToast = document.createElement('div');
    loadingToast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
    loadingToast.textContent = 'Opening PulseCam...';
    document.body.appendChild(loadingToast);
    
    // Get the deep link from server
    Meteor.call('createPulseUploadForTicket', ticketId, (err, result) => {
      // Remove loading toast
      loadingToast.remove();
      
      if (err) {
        // Show error briefly then try App Store anyway
        alert(err.reason || 'Failed to create upload link');
        return;
      }
      
      // Try to open app, fallback to App Store
      openPulseCamOrAppStore(result.deeplink);
    });
    return;
  }
  
  // On desktop: show modal with QR code
  pulseUploadState.ticketId.set(ticketId);
  pulseUploadState.ticketTitle.set(ticketTitle);
  pulseUploadState.loading.set(true);
  pulseUploadState.error.set(null);
  pulseUploadState.data.set(null);

  // Show modal
  const modal = document.getElementById('pulseUploadModal');
  if (modal) {
    modal.showModal();
  }

  // Call server to create upload link
  Meteor.call('createPulseUploadForTicket', ticketId, (err, result) => {
    pulseUploadState.loading.set(false);
    if (err) {
      pulseUploadState.error.set(err.reason || err.message || 'Failed to create upload link');
      return;
    }
    pulseUploadState.data.set(result);

    // Render QR code after data is set
    Tracker.afterFlush(() => {
      renderQrCode(result.qrData);
    });
  });
}

/**
 * Render QR code to the container element
 * @param {String} data - The data to encode in the QR code
 */
function renderQrCode(data) {
  const container = document.getElementById('pulseQrCode');
  if (!container || !data) return;

  // Clear previous content
  container.innerHTML = '';

  // Create canvas element
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  // Generate QR code
  QRCode.toCanvas(canvas, data, {
    width: 192,
    margin: 2,
    color: {
      dark: '#1f2937',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  }, (err) => {
    if (err) {
      console.error('Failed to generate QR code:', err);
      container.innerHTML = '<p class="text-red-500 text-sm">Failed to generate QR code</p>';
    }
  });
}

/**
 * Close the pulse upload modal and reset state
 */
function closePulseUploadModal() {
  const modal = document.getElementById('pulseUploadModal');
  if (modal) {
    modal.close();
  }
  
  // Reset state
  pulseUploadState.loading.set(false);
  pulseUploadState.error.set(null);
  pulseUploadState.data.set(null);
  pulseUploadState.ticketId.set(null);
  pulseUploadState.ticketTitle.set(null);
}

// Template helpers
Template.pulseUploadModal.helpers({
  pulseUploadLoading() {
    return pulseUploadState.loading.get();
  },

  pulseUploadError() {
    return pulseUploadState.error.get();
  },

  pulseUploadData() {
    return pulseUploadState.data.get();
  },

  pulseUploadTicketTitle() {
    return pulseUploadState.ticketTitle.get();
  }
});

// Template events
Template.pulseUploadModal.events({
  'click .close-pulse-upload-modal'(event) {
    event.preventDefault();
    closePulseUploadModal();
  },

  'click .retry-pulse-upload'(event) {
    event.preventDefault();
    
    const ticketId = pulseUploadState.ticketId.get();
    const ticketTitle = pulseUploadState.ticketTitle.get();

    if (ticketId) {
      openPulseUploadForTicket(ticketId, ticketTitle);
    }
  }
});
