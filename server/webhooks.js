import { WebApp } from 'meteor/webapp';
import { CalendarConnections, CalendarEvents } from '../collections.js';

// Webhook endpoint for Google Calendar push notifications
WebApp.connectHandlers.use('/webhooks/google/calendar', async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  try {
    // Verify Google webhook signature if configured
    const channelId = req.headers['x-goog-channel-id'];
    const resourceId = req.headers['x-goog-resource-id'];
    const resourceState = req.headers['x-goog-resource-state'];

    console.log('Google Calendar webhook received:', {
      channelId,
      resourceId,
      resourceState
    });

    // For demo purposes, we'll just trigger a refresh for all Google calendar connections
    if (resourceState === 'exists') {
      const connections = await CalendarConnections.find({ 
        provider: 'google',
        'webhookChannelId': channelId 
      }).fetchAsync();

      for (const connection of connections) {
        // Trigger calendar refresh for this user
        Meteor.call('calendar.refreshEvents', 'google', { userId: connection.userId });
      }
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } catch (error) {
    console.error('Google Calendar webhook error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

// Webhook endpoint for Microsoft Graph calendar notifications
WebApp.connectHandlers.use('/webhooks/microsoft/calendar', async (req, res) => {
  if (req.method === 'GET') {
    // Microsoft Graph webhook validation
    const validationToken = req.query.validationToken;
    if (validationToken) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(validationToken);
      return;
    }
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const notification = JSON.parse(body);
        console.log('Microsoft Calendar webhook received:', notification);

        // Process each notification in the value array
        if (notification.value && Array.isArray(notification.value)) {
          for (const change of notification.value) {
            // Find connection by subscription ID
            const connection = await CalendarConnections.findOneAsync({
              provider: 'microsoft',
              'webhookSubscriptionId': change.subscriptionId
            });

            if (connection) {
              // Trigger calendar refresh for this user
              Meteor.call('calendar.refreshEvents', 'microsoft', { userId: connection.userId });
            }
          }
        }

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      } catch (parseError) {
        console.error('Microsoft Calendar webhook parse error:', parseError);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
      }
    });
  } catch (error) {
    console.error('Microsoft Calendar webhook error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

// OAuth callback handlers
WebApp.connectHandlers.use('/auth/google/callback', async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // This should be the userId
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(302, { 'Location': '/calendar?error=' + encodeURIComponent(error) });
      res.end();
      return;
    }

    if (code && state) {
      // Exchange code for tokens (mock implementation)
      const mockTokens = {
        access_token: 'mock-google-access-token-' + Date.now(),
        refresh_token: 'mock-google-refresh-token-' + Date.now(),
        expires_in: 3600
      };

      // Store the connection
      await CalendarConnections.upsertAsync(
        { userId: state, provider: 'google' },
        {
          $set: {
            accessToken: mockTokens.access_token,
            refreshToken: mockTokens.refresh_token,
            expiresAt: new Date(Date.now() + mockTokens.expires_in * 1000),
            lastSync: new Date(),
            updatedAt: new Date()
          },
          $setOnInsert: {
            provider: 'google',
            userId: state,
            createdAt: new Date()
          }
        }
      );

      // Redirect back to calendar page with success
      res.writeHead(302, { 'Location': '/calendar?connected=google' });
      res.end();
    } else {
      res.writeHead(302, { 'Location': '/calendar?error=missing_code' });
      res.end();
    }
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.writeHead(302, { 'Location': '/calendar?error=server_error' });
    res.end();
  }
});

WebApp.connectHandlers.use('/auth/microsoft/callback', async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // This should be the userId
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(302, { 'Location': '/calendar?error=' + encodeURIComponent(error) });
      res.end();
      return;
    }

    if (code && state) {
      // Exchange code for tokens (mock implementation)
      const mockTokens = {
        access_token: 'mock-microsoft-access-token-' + Date.now(),
        refresh_token: 'mock-microsoft-refresh-token-' + Date.now(),
        expires_in: 3600
      };

      // Store the connection
      await CalendarConnections.upsertAsync(
        { userId: state, provider: 'microsoft' },
        {
          $set: {
            accessToken: mockTokens.access_token,
            refreshToken: mockTokens.refresh_token,
            expiresAt: new Date(Date.now() + mockTokens.expires_in * 1000),
            lastSync: new Date(),
            updatedAt: new Date()
          },
          $setOnInsert: {
            provider: 'microsoft',
            userId: state,
            createdAt: new Date()
          }
        }
      );

      // Redirect back to calendar page with success
      res.writeHead(302, { 'Location': '/calendar?connected=microsoft' });
      res.end();
    } else {
      res.writeHead(302, { 'Location': '/calendar?error=missing_code' });
      res.end();
    }
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);
    res.writeHead(302, { 'Location': '/calendar?error=server_error' });
    res.end();
  }
});

console.log('Calendar webhook endpoints registered:');
console.log('- POST /webhooks/google/calendar');
console.log('- POST /webhooks/microsoft/calendar'); 
console.log('- GET /auth/google/callback');
console.log('- GET /auth/microsoft/callback');