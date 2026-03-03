
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import QRCode from 'qrcode';
import './PulseUpload.html';

// Reactive state for the pulse upload modal
const pulseUploadState = {
  loading: new ReactiveVar(false),
  error: new ReactiveVar(null),
  data: new ReactiveVar(null),
  ticketId: new ReactiveVar(null),
  ticketTitle: new ReactiveVar(null)
};

/**
 * Open the pulse upload modal for a ticket
 * @param {String} ticketId - The ticket ID
 * @param {String} ticketTitle - The ticket title for display
 */
export function openPulseUploadForTicket(ticketId, ticketTitle) {
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
