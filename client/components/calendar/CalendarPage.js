import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams } from '../../../collections.js';

Template.calendar.onCreated(function () {
  this.calendarEvents = new ReactiveVar([]);
  this.isSyncingCalendar = new ReactiveVar(false);
  this.calendarError = new ReactiveVar('');
});

Template.calendar.helpers({
  calendarEvents() {
    return Template.instance().calendarEvents.get();
  },
  hasCalendarEvents() {
    return Template.instance().calendarEvents.get().length > 0;
  },
  isSyncingCalendar() {
    return Template.instance().isSyncingCalendar.get();
  },
  calendarError() {
    return Template.instance().calendarError.get();
  },
  // Google Calendar Integration - COMMENTED OUT
  // hasGoogleAccount() {
  //   const user = Meteor.user();
  //   return user?.services?.google;
  // }
});

Template.calendar.events({
  // Google Calendar Integration - COMMENTED OUT
  // 'click #reauth-google'(event, template) {
  //   event.preventDefault();
  //   authenticateGoogle(template, true);
  // },
  // 
  // 'click #connect-google-account'(event, template) {
  //   event.preventDefault();
  //   authenticateGoogle(template, false);
  // },

  
  'click .log-meeting'(event, template) {
    event.preventDefault();
    
    const meetingId = event.currentTarget.dataset.meetingId;
    const duration = parseInt(event.currentTarget.dataset.duration);
    const title = event.currentTarget.dataset.title;
    
    // Get user's teams
    const userTeams = Teams.find({ 
      $or: [
        { members: Meteor.userId() },
        { leader: Meteor.userId() },
        { admins: Meteor.userId() }
      ]
    }).fetch();
    
    if (userTeams.length === 0) {
      alert('You need to be a member of at least one team to log time.');
      return;
    }
    
    // If user has only one team, use it directly
    if (userTeams.length === 1) {
      logCalendarMeeting(userTeams[0]._id, meetingId, title, duration);
      return;
    }
    
    // Multiple teams - show selection modal
    showTeamSelectionModal(userTeams, meetingId, title, duration);
  }
});

// Google Calendar Integration - COMMENTED OUT
// // Helper function for Google CALENDAR authentication (separate from login)
// function authenticateGoogle(template, isReauth = false) {
//   const options = {
//     requestPermissions: ['email', 'profile', 'https://www.googleapis.com/auth/calendar.readonly'], // Add calendar access
//     requestOfflineToken: true,
//     loginStyle: 'popup'
//   };
//   
//   if (isReauth) {
//     options.forceApprovalPrompt = true;
//   }
//   
//   Meteor.loginWithGoogle(options, (error) => {
//     if (error) {
//       template.calendarError.set(`Failed to ${isReauth ? 're-authenticate' : 'connect'}: ${error.reason}`);
//     } else {
//       template.calendarError.set('');
//       // Auto-fetch calendar events after successful connection
//       setTimeout(() => {
//         template.isSyncingCalendar.set(true);
//         Meteor.call('getMyCalendarEvents', (error, result) => {
//           template.isSyncingCalendar.set(false);
//           if (error) {
//             template.calendarError.set(error.reason || 'Failed to fetch calendar events');
//           } else {
//             template.calendarEvents.set(result.meetings || []);
//             template.calendarError.set('');
//           }
//         });
//       }, 1000);
//     }
//   });
// }

// Helper function for logging calendar meetings
function logCalendarMeeting(teamId, meetingId, title, duration) {
  const button = $(`.log-meeting[data-meeting-id="${meetingId}"]`);
  const originalText = button.text();
  button.text('Logging...').prop('disabled', true);
  
  Meteor.call('logCalendarMeeting', {
    teamId, meetingId, title, duration
  }, (error, result) => {
    button.text(originalText).prop('disabled', false);
    
    if (error) {
      alert(`Failed to log meeting time: ${error.reason || error.message}`);
    } else {
      button.text('✓ Logged').addClass('btn-success').removeClass('btn-primary');
      alert(`Successfully logged ${duration} minutes for "${title}"`);
      setTimeout(() => button.prop('disabled', true), 1000);
    }
  });
}

// Helper function for team selection modal
function showTeamSelectionModal(userTeams, meetingId, title, duration) {
  const modalHtml = `
    <div id="team-selection-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">Select Team for Meeting</h3>
        <p class="text-sm text-gray-600 mb-4">
          Which team should this meeting time be logged to?<br>
          <strong>"${title}"</strong> (${duration} minutes)
        </p>
        <div class="space-y-2 mb-4">
          ${userTeams.map(team => `
            <button class="team-select-btn w-full text-left p-3 border rounded hover:bg-gray-50" 
                    data-team-id="${team._id}">
              <div class="font-medium">${team.name}</div>
              <div class="text-sm text-gray-500">
                ${team.leader === Meteor.userId() ? 'Leader' : 'Member'}
              </div>
            </button>
          `).join('')}
        </div>
        <button id="cancel-team-selection" class="btn btn-outline w-full">Cancel</button>
      </div>
    </div>
  `;
  
  $('body').append(modalHtml);
  
  // Handle team selection
  $('.team-select-btn').on('click', function() {
    const teamId = $(this).data('team-id');
    $('#team-selection-modal').remove();
    logCalendarMeeting(teamId, meetingId, title, duration);
  });
  
  // Handle cancel and backdrop click
  $('#cancel-team-selection, #team-selection-modal').on('click', function(e) {
    if (e.target === this) {
      $('#team-selection-modal').remove();
    }
  });
}