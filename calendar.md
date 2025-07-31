# Calendar Integration Documentation

TimeHarbor supports integration with external calendar services to help users automatically suggest time entries based on their scheduled meetings and appointments.

## Supported Calendar Providers

### Google Calendar
- **Module**: googleapis
- **Authentication**: OAuth 2.0
- **API**: Google Calendar API v3
- **Permissions Required**: `https://www.googleapis.com/auth/calendar.readonly`

### Microsoft Outlook/Office 365
- **Module**: @microsoft/microsoft-graph-client
- **Authentication**: OAuth 2.0
- **API**: Microsoft Graph API
- **Permissions Required**: `https://graph.microsoft.com/calendars.read`

## OAuth Setup and Configuration

### Google Calendar Setup
1. Create a Google Cloud Project at https://console.cloud.google.com/
2. Enable the Google Calendar API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://yourdomain.com/auth/google/callback` (production)
5. Set environment variables:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

### Microsoft Graph Setup
1. Register an application in Azure Active Directory
2. Configure API permissions for Microsoft Graph:
   - Calendars.Read (delegated permission)
3. Add redirect URIs:
   - `http://localhost:3000/auth/microsoft/callback` (development)
   - `https://yourdomain.com/auth/microsoft/callback` (production)
4. Set environment variables:
   ```
   MICROSOFT_CLIENT_ID=your_client_id
   MICROSOFT_CLIENT_SECRET=your_client_secret
   ```

## Data Access and Privacy

### What Data is Accessed
- **Event Title**: For display and time entry suggestions
- **Event Start/End Time**: To calculate duration and suggest logged time
- **Event Status**: To filter out cancelled events
- **Attendee Status**: To confirm user attendance (optional)

### What Data is NOT Accessed
- Event descriptions or detailed content
- Private event details beyond title
- Attendee email addresses or personal information
- Event locations (unless needed for time entry context)

### Data Storage Policy
- **OAuth Tokens**: Encrypted and stored securely in user profiles
- **Calendar Events**: Temporarily cached for suggestion purposes only
- **Event Details**: Minimal data stored, only what's necessary for time logging
- **Retention**: Calendar data is not permanently stored; refreshed on each login

### User Control
- Users can connect/disconnect calendar services at any time
- Individual events can be dismissed permanently
- No automatic time logging without explicit user confirmation
- Users control which events are suggested based on their attendance

## How Calendar Integration Works

### Event Fetching
1. **On Login**: Fetch events from the past 7 days and next 7 days
2. **Real-time Updates**: Optional webhook notifications for new/updated events
3. **Manual Refresh**: Users can manually refresh calendar events

### Event Filtering
- Only events where the user is an attendee
- Exclude all-day events
- Exclude events marked as "free" or "out of office"
- Exclude cancelled events
- Only events longer than 15 minutes

### Time Suggestion Logic
- Suggest the full duration of the meeting for logging
- Allow users to adjust the time before confirming
- Pre-fill project/team if event title matches existing projects
- Suggest activity title based on event title

### Event Confirmation Workflow
1. Display list of unlogged calendar events
2. Show event title, time, duration, and suggested log time
3. Allow user to:
   - Confirm and log with suggested time
   - Adjust time before logging
   - Dismiss event (won't show again)
   - Snooze event (show again later)

## Security Considerations

### OAuth Token Security
- Tokens are encrypted before database storage
- Refresh tokens are rotated regularly
- Access tokens have limited scope and lifetime
- Tokens are never logged or exposed in client-side code

### API Rate Limiting
- Implement exponential backoff for API requests
- Cache responses to minimize API calls
- Respect provider rate limits and quotas

### Error Handling
- Graceful degradation when calendar services are unavailable
- Clear error messages for authentication failures
- Automatic token refresh handling

## Webhook Support (Optional Enhancement)

### Google Calendar Webhooks
- Use Google Calendar Push Notifications
- Set up webhook endpoint: `/webhooks/google/calendar`
- Verify webhook signatures for security
- Handle event notifications in real-time

### Microsoft Graph Webhooks
- Use Microsoft Graph subscriptions
- Set up webhook endpoint: `/webhooks/microsoft/calendar`
- Implement subscription renewal logic
- Handle event change notifications

## User Interface

### Calendar Connection Settings
- Located in user profile or main navigation
- Simple connect/disconnect buttons for each provider
- Display connection status and last sync time
- Option to refresh calendar data manually

### Event Confirmation Interface
- Dedicated section on home page or separate calendar page
- List of pending calendar events
- Quick action buttons for each event
- Batch actions for multiple events

## Installation and Dependencies

### Required NPM Packages
```bash
npm install googleapis @microsoft/microsoft-graph-client
```

### Environment Configuration
```javascript
// In settings.json or environment variables
{
  "google": {
    "clientId": "your_google_client_id",
    "clientSecret": "your_google_client_secret"
  },
  "microsoft": {
    "clientId": "your_microsoft_client_id",
    "clientSecret": "your_microsoft_client_secret"
  }
}
```

## API Methods

### Client Methods
- `connectGoogleCalendar()` - Initiate Google OAuth flow
- `connectMicrosoftCalendar()` - Initiate Microsoft OAuth flow
- `disconnectCalendar(provider)` - Remove calendar connection
- `refreshCalendarEvents()` - Manually refresh events
- `confirmCalendarEvent(eventId, timeData)` - Confirm and log event
- `dismissCalendarEvent(eventId)` - Dismiss event permanently

### Server Methods
- `calendar.fetchEvents(provider, dateRange)` - Fetch events from calendar API
- `calendar.storeTokens(provider, tokens)` - Securely store OAuth tokens
- `calendar.createTimeEntry(eventData)` - Create time entry from calendar event
- `calendar.handleWebhook(provider, payload)` - Process webhook notifications

## Privacy Statement for Users

TimeHarbor's calendar integration is designed with your privacy in mind:

- **Read-Only Access**: We only read your calendar data; we never modify or create events
- **Minimal Data**: We only access event titles, times, and your attendance status
- **No Permanent Storage**: Calendar events are not permanently stored in our database
- **User Control**: You decide which events to log and can disconnect your calendar at any time
- **Secure Storage**: Any temporary data is encrypted and secured
- **No Sharing**: Your calendar data is never shared with third parties

## Troubleshooting

### Common Issues
1. **OAuth Authorization Errors**: Check client ID and redirect URI configuration
2. **API Rate Limits**: Implement exponential backoff and caching
3. **Token Expiration**: Ensure proper refresh token handling
4. **Webhook Failures**: Verify webhook URL accessibility and signature validation

### Support
For calendar integration issues, check:
1. Environment variable configuration
2. OAuth application settings in provider console
3. Network connectivity to calendar APIs
4. Server logs for detailed error messages