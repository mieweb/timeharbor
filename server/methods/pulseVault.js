import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { PulseDrafts, Tickets } from '../../collections.js';
import crypto from 'crypto';

/**
 * PulseVault integration methods
 * Generates deep links and QR data for uploading media via PulseCam app
 */

export const pulseVaultMethods = {
  /**
   * Get or create a PulseVault draft and deeplink/QR data for a ticket.
   * Reuses the same draftId and cached QR data - only calls API once per ticket.
   * @param {String} ticketId - The ticket to attach the draft to
   * @returns {Object} - Contains deeplink, qrData, draftId
   */
  async createPulseUploadForTicket(ticketId) {
    check(ticketId, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');

    // Verify ticket exists and user has access
    const ticket = await Tickets.findOneAsync(ticketId);
    if (!ticket) throw new Meteor.Error('not-found', 'Ticket not found');

    // Check if a draft already exists for this ticket with cached QR data
    const existingDraft = await PulseDrafts.findOneAsync({ ticketId });
    
    // If we have cached data, return it immediately (no API call needed)
    if (existingDraft?.deeplink && existingDraft?.qrData) {
      return {
        draftId: existingDraft.draftId,
        deeplink: existingDraft.deeplink,
        qrData: existingDraft.qrData
      };
    }

    // Get user email
    const user = await Meteor.users.findOneAsync(this.userId);
    const userEmail = user?.emails?.[0]?.address;
    if (!userEmail) throw new Meteor.Error('no-email', 'User email not found');

    // Get API key from settings
    const apiKey = Meteor.settings?.private?.PULSE_PRIVATE_KEY;
    if (!apiKey) throw new Meteor.Error('config-error', 'PulseVault API key not configured');

    // Use existing draftId or generate a new one
    const draftId = existingDraft?.draftId || crypto.randomUUID();

    // Call PulseVault API to get deeplink (only on first creation)
    const response = await fetch('https://pulse-vault.opensource.mieweb.org/api/qr/deeplink', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        draftId,
        externalApp: 'timeharbour',
        externalUserEmail: userEmail
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PulseVault API error:', errorText);
      throw new Meteor.Error('api-error', 'Failed to create PulseVault upload link');
    }

    const pulseData = await response.json();

    // Store the draft record with cached QR data
    if (existingDraft) {
      // Update existing draft with QR data
      await PulseDrafts.updateAsync(existingDraft._id, {
        $set: {
          deeplink: pulseData.deeplink,
          qrData: pulseData.qrData
        }
      });
    } else {
      // Insert new draft with QR data
      await PulseDrafts.insertAsync({
        draftId,
        ticketId,
        userId: this.userId,
        userEmail,
        deeplink: pulseData.deeplink,
        qrData: pulseData.qrData,
        createdAt: new Date(),
        status: 'active'
      });
    }

    return {
      draftId,
      deeplink: pulseData.deeplink,
      qrData: pulseData.qrData
    };
  }
};

// Register methods with Meteor
Meteor.methods({
  createPulseUploadForTicket: pulseVaultMethods.createPulseUploadForTicket
});
