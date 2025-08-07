import { Template } from 'meteor/templating';
import { Teams, Tickets, ClockEvents } from '../../../collections.js';
import { currentTime } from '../layout/MainLayout.js';
import { formatTime, formatDate, calculateTotalTime } from '../../utils/TimeUtils.js';
import { getTeamName, getUserName } from '../../utils/UserTeamUtils.js';
import { isTeamsLoading, isClockEventsLoading } from '../layout/MainLayout.js';

Template.home.onCreated(function () {
  this.autorun(() => {
    // userTeams and clockEventsForUser subscriptions moved to MainLayout
    // Subscribe to all clock events for teams the user leads
    const leaderTeams = Teams.find({ leader: Meteor.userId() }).fetch();
    const teamIds = leaderTeams.map(t => t._id);
    if (teamIds.length) {
      this.subscribe('clockEventsForTeams', teamIds);
      // Also subscribe to all tickets for these teams
      this.subscribe('teamTickets', teamIds);
    }
    // Subscribe to all users in those teams for username display
    const allMembers = Array.from(new Set(leaderTeams.flatMap(t => t.members)));
    if (allMembers.length) {
      this.subscribe('usersByIds', allMembers);
    }
  });
});

Template.home.helpers({
  leaderTeams() {
    return Teams.find({ leader: Meteor.userId() }).fetch();
  },
  teamClockEvents(teamId) {
    return ClockEvents.find({ teamId }).fetch();
  },
  allClockEvents() {
    // Show all clock events for teams the user leads, flat list, most recent first
    const leaderTeams = Teams.find({ leader: Meteor.userId() }).fetch();
    const teamIds = leaderTeams.map(t => t._id);
    return ClockEvents.find({ teamId: { $in: teamIds } }, { sort: { startTimestamp: -1 } }).fetch();
  },
  teamName: getTeamName,
  userName: getUserName,
  formatDate,  // Using imported utility
  ticketTitle(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    return ticket ? ticket.title : `Unknown Ticket (${ticketId})`;
  },
  clockEventTotalTime(clockEvent) {
    return calculateTotalTime(clockEvent);  // Using imported utility
  },
  ticketTotalTime(ticket) {
    return calculateTotalTime(ticket);  // Using imported utility
  },
  formatTime,  // Using imported utility
});