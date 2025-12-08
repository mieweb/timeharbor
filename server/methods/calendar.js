// Google Calendar Integration - COMMENTED OUT
// import { Meteor } from 'meteor/meteor';
// 
// Meteor.methods({
//   async 'getMyCalendarEvents'() {
//     if (!this.userId) {
//       throw new Meteor.Error('not-authorized', 'Must be logged in');
//     }
// 
//     const user = await Meteor.userAsync();
//     
//     // Check if user has Google account with calendar access
//     if (!user?.services?.google?.accessToken) {
//       throw new Meteor.Error('no-calendar-access', 'No Google Calendar access. Please login with Google.');
//     }
// 
//     const accessToken = user.services.google.accessToken;
// 
//     try {
//       // Get calendar events from past 7 days to next 30 days
//       const now = new Date();
//       const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
//       const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
// 
//       // Call Google Calendar API
//       const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
//       url.searchParams.set('timeMin', pastWeek.toISOString());
//       url.searchParams.set('timeMax', nextMonth.toISOString());
//       url.searchParams.set('singleEvents', 'true');
//       url.searchParams.set('orderBy', 'startTime');
//       url.searchParams.set('maxResults', '20');
//       
//       const response = await fetch(url.toString(), {
//         headers: { 'Authorization': `Bearer ${accessToken}` }
//       });
// 
//       if (!response.ok) {
//         throw new Meteor.Error('api-error', `Failed to fetch calendar events: ${response.status}`);
//       }
// 
//       const responseData = await response.json();
//       const events = responseData.items || [];
// 
//       // Process events to get only what we need
//       const meetings = events
//         .filter(event => event.start?.dateTime) // Only timed events
//         .map(event => {
//           const startTime = new Date(event.start.dateTime);
//           const endTime = new Date(event.end.dateTime);
//           const duration = Math.round((endTime - startTime) / 60000); // minutes
// 
//           return {
//             id: event.id,
//             title: event.summary || 'Untitled Meeting',
//             date: startTime.toLocaleDateString(),
//             time: startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
//             endTime: endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
//             duration: duration
//           };
//         })
//         .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
// 
//       return {
//         success: true,
//         meetings: meetings,
//         count: meetings.length
//       };
// 
//     } catch (error) {
//       if (error.message?.includes('401')) {
//         throw new Meteor.Error('auth-expired', 'Calendar access expired. Please login again.');
//       }
//       throw new Meteor.Error('fetch-failed', 'Could not fetch calendar events');
//     }
//   }
// });