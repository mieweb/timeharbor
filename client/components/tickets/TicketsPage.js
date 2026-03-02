import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Teams, Tickets, ClockEvents } from '../../../collections.js';
import { currentTime, selectedTeamId } from '../layout/MainLayout.js';
import { formatTime, formatDurationText } from '../../utils/TimeUtils.js';
import { sessionManager } from '../../utils/clockSession.js';
import { extractUrlTitle, openExternalUrl, normalizeReferenceUrl } from '../../utils/UrlUtils.js';
import { getUserTeams, getUserName } from '../../utils/UserTeamUtils.js';
import { OPEN_TICKET_HISTORY_SESSION_KEY, OPEN_TICKET_HISTORY_RETURN_ROUTE_KEY } from '../../utils/UiStateKeys.js';

// Utility functions
const utils = {
  // Safe Meteor call wrapper
  meteorCall: (methodName, ...args) => {
    return new Promise((resolve, reject) => {
      Meteor.call(methodName, ...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },

  // Get current timestamp
  now: () => Date.now(),

  // Safe error handling
  handleError: (error, message = 'Operation failed') => {
    console.error(message, error);
    alert(`${message}: ${error.reason || error.message}`);
  }
};

// Ticket management functions
const ticketManager = {
  // Start a new ticket
  startTicket: async (ticketId, templateInstance, clockEvent) => {
    try {
      templateInstance.activeTicketId.set(ticketId);
      const now = utils.now();
      
      await utils.meteorCall('updateTicketStart', ticketId, now);
      
      if (clockEvent) {
        await utils.meteorCall('clockEventAddTicket', clockEvent._id, ticketId, now);
      }
    } catch (error) {
      utils.handleError(error, 'Failed to start timer');
      templateInstance.activeTicketId.set(null);
    }
  },

  // Stop a ticket
  stopTicket: async (ticketId, clockEvent) => {
    try {
      const now = utils.now();
      await utils.meteorCall('updateTicketStop', ticketId, now);
      
      if (clockEvent) {
        await utils.meteorCall('clockEventStopTicket', clockEvent._id, ticketId, now);
      }
      return true;
    } catch (error) {
      utils.handleError(error, 'Failed to stop timer');
      return false;
    }
  },

  // Switch from one ticket to another
  switchTicket: async (newTicketId, templateInstance, clockEvent) => {
    const currentActiveId = templateInstance.activeTicketId.get();
    
    if (currentActiveId) {
      const success = await ticketManager.stopTicket(currentActiveId, clockEvent);
      if (!success) return false;
    }
    
    await ticketManager.startTicket(newTicketId, templateInstance, clockEvent);
    return true;
  }
};

const HIGHLIGHT_DURATION_MS = 2000;

const TICKET_HISTORY_DEFAULT_RANGE = 'today';
const TICKET_HISTORY_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'thisQuarter', label: 'This Quarter' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom' }
];

function formatHistoryClockTime(timestamp) {
  if (typeof timestamp !== 'number') return '—';
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getLiveHistoryDeltaSeconds(historyData, nowMs) {
  if (!historyData?.hasRunningSession || typeof historyData.generatedAt !== 'number') return 0;
  return Math.max(0, Math.floor((nowMs - historyData.generatedAt) / 1000));
}

function getLiveRangeDeltaSeconds(historyData, nowMs) {
  if (!historyData?.hasRunningSession || typeof historyData.generatedAt !== 'number') return 0;
  if (typeof historyData.rangeStart !== 'number' || typeof historyData.rangeEnd !== 'number') return 0;

  const overlapStart = Math.max(historyData.generatedAt, historyData.rangeStart);
  const overlapEnd = Math.min(nowMs, historyData.rangeEnd);
  if (overlapStart >= overlapEnd) return 0;
  return Math.floor((overlapEnd - overlapStart) / 1000);
}

function buildTicketHistoryOptions(templateInstance) {
  const rangeType = templateInstance.ticketHistoryRangeType?.get() || TICKET_HISTORY_DEFAULT_RANGE;
  const options = { rangeType };
  if (rangeType === 'custom') {
    const customStartDate = templateInstance.ticketHistoryCustomStartDate?.get();
    const customEndDate = templateInstance.ticketHistoryCustomEndDate?.get();
    if (!customStartDate || !customEndDate) return null;
    options.customStartDate = customStartDate;
    options.customEndDate = customEndDate;
  }
  return options;
}

function loadTicketHistory(templateInstance) {
  const ticketId = templateInstance.ticketIdForHistory?.get();
  if (!ticketId) return;
  const options = buildTicketHistoryOptions(templateInstance);
  if (!options) return;

  templateInstance.ticketHistoryLoading.set(true);
  templateInstance.ticketHistoryError.set(null);
  templateInstance.ticketHistoryData.set(null);

  Meteor.call('getTicketTimeHistory', ticketId, options, (err, result) => {
    templateInstance.ticketHistoryLoading.set(false);
    if (err) {
      templateInstance.ticketHistoryError.set(err.reason || err.message || 'Failed to load history');
      templateInstance.ticketHistoryData.set(null);
      return;
    }

    const selectedSessions = Array.isArray(result.selectedSessions)
      ? result.selectedSessions.map((session) => ({
        ...session,
        startTimeText: formatHistoryClockTime(session.startTimestamp),
        endTimeText: session.isOngoing ? 'Ongoing' : formatHistoryClockTime(session.endTimestamp),
        durationText: formatDurationText(session.durationSeconds || 0)
      }))
      : [];

    templateInstance.ticketHistoryData.set({
      ...result,
      selectedSessions
    });
  });
}

function openTicketHistoryModal(templateInstance, ticketId) {
  if (!ticketId) return;
  templateInstance.ticketHistoryRangeType.set(TICKET_HISTORY_DEFAULT_RANGE);
  templateInstance.ticketHistoryCustomStartDate.set(null);
  templateInstance.ticketHistoryCustomEndDate.set(null);
  templateInstance.ticketIdForHistory.set(ticketId);
  Tracker.afterFlush(() => {
    const modal = document.getElementById('ticketHistoryModal');
    if (modal) {
      const onClose = () => {
        finalizeTicketHistoryClose(templateInstance);
        modal.removeEventListener('close', onClose);
      };
      modal.addEventListener('close', onClose);
      modal.showModal();
    }
  });
  loadTicketHistory(templateInstance);
}

function finalizeTicketHistoryClose(templateInstance) {
  templateInstance.ticketIdForHistory.set(null);
  templateInstance.ticketHistoryLoading.set(false);
  templateInstance.ticketHistoryError.set(null);
  templateInstance.ticketHistoryData.set(null);
  templateInstance.ticketHistoryRangeType.set(TICKET_HISTORY_DEFAULT_RANGE);
  templateInstance.ticketHistoryCustomStartDate.set(null);
  templateInstance.ticketHistoryCustomEndDate.set(null);

  const returnRoute = Session.get(OPEN_TICKET_HISTORY_RETURN_ROUTE_KEY);
  if (returnRoute) {
    Session.set(OPEN_TICKET_HISTORY_RETURN_ROUTE_KEY, null);
    FlowRouter.go(returnRoute);
  }
}

function processCreateTicketGithubInput(value, templateInstance) {
  const trimmed = (value || '').trim();
  const isEditing = templateInstance.editingTicket.get();
  
  if (!trimmed) {
    // When editing, keep title field visible even if GitHub is cleared
    if (!isEditing) {
      templateInstance.showTitleField.set(false);
      templateInstance.createTicketTitle.set('');
    }
    templateInstance.createTicketLoadingTitle.set(false);
    return;
  }
  const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');
  if (isUrl) {
    templateInstance.createTicketLoadingTitle.set(true);
    Meteor.call('extractUrlTitle', trimmed, (err, result) => {
      templateInstance.createTicketLoadingTitle.set(false);
      if (!err && result?.title) {
        templateInstance.createTicketTitle.set(result.title);
        templateInstance.showTitleField.set(true);
      }
    });
  } else {
    templateInstance.createTicketTitle.set(trimmed);
    templateInstance.showTitleField.set(true);
  }
}

/** Reset all GitHub browse state on the template instance. */
function resetGitHubBrowseState(t) {
  t.createTicketTab.set('manual');
  t.ghRepoSearchQuery.set('');
  t.ghRepoResults.set([]);
  t.ghReposLoading.set(false);
  t.ghReposError.set(null);
  t.ghSelectedRepo.set(null);
  t.ghIssueSearchQuery.set('');
  t.ghIssueResults.set([]);
  t.ghIssuesLoading.set(false);
  t.ghIssuesError.set(null);
  if (t._ghRepoSearchTimer) { clearTimeout(t._ghRepoSearchTimer); t._ghRepoSearchTimer = null; }
  if (t._ghIssueSearchTimer) { clearTimeout(t._ghIssueSearchTimer); t._ghIssueSearchTimer = null; }
}

/** Clear issue-level state and go back to repo list. */
function clearSelectedRepo(t) {
  t.ghSelectedRepo.set(null);
  t.ghIssueSearchQuery.set('');
  t.ghIssueResults.set([]);
  t.ghIssuesLoading.set(false);
  t.ghIssuesError.set(null);
}

/** Parse 'owner/repo' into { owner, repo }. */
function parseRepoFullName(fullName) {
  const [owner, ...rest] = (fullName || '').split('/');
  return { owner, repo: rest.join('/') };
}

/** Reset all create-ticket modal state on the template instance. */
function resetCreateTicketModal(t) {
  t.showCreateTicketForm.set(false);
  t.editingTicket.set(null);
  t.createTicketTitle.set('');
  t.showTitleField.set(false);
  t.createTicketFromClockInNewTicket.set(false);
  resetGitHubBrowseState(t);
}

/** Debounced repo search */
function searchGitHubRepos(t, query) {
  if (t._ghRepoSearchTimer) clearTimeout(t._ghRepoSearchTimer);
  t.ghReposError.set(null);

  const trimmed = (query || '').trim();
  if (!trimmed) {
    // Load user's repos by default when no query
    t.ghReposLoading.set(true);
    Meteor.call('searchGitHubRepos', '', (err, results) => {
      t.ghReposLoading.set(false);
      if (err) { t.ghReposError.set(err.reason || 'Failed to load repos'); return; }
      t.ghRepoResults.set(results || []);
    });
    return;
  }

  t._ghRepoSearchTimer = setTimeout(() => {
    t.ghReposLoading.set(true);
    Meteor.call('searchGitHubRepos', trimmed, (err, results) => {
      t.ghReposLoading.set(false);
      if (err) { t.ghReposError.set(err.reason || 'Search failed'); return; }
      t.ghRepoResults.set(results || []);
    });
  }, 400);
}

/** Load GitHub issues for selected repo */
function loadGitHubIssues(t, query) {
  if (t._ghIssueSearchTimer) clearTimeout(t._ghIssueSearchTimer);
  t.ghIssuesError.set(null);

  const { owner, repo } = parseRepoFullName(t.ghSelectedRepo.get());
  if (!owner || !repo) return;

  const doFetch = () => {
    t.ghIssuesLoading.set(true);
    Meteor.call('getGitHubIssues', owner, repo, { query: query || '', state: 'open' }, (err, results) => {
      t.ghIssuesLoading.set(false);
      if (err) { t.ghIssuesError.set(err.reason || 'Failed to load issues'); return; }
      t.ghIssueResults.set(results || []);
    });
  };

  if (query) {
    t._ghIssueSearchTimer = setTimeout(doFetch, 400);
  } else {
    doFetch();
  }
}

Template.tickets.onCreated(function () {
  this.showCreateTicketForm = new ReactiveVar(false);
  this.showEditTicketForm = new ReactiveVar(false);
  this.editingTicket = new ReactiveVar(null);
  this.activeTicketId = new ReactiveVar(null);
  this.clockedIn = new ReactiveVar(false);
  this.autoClockOutTriggered = new ReactiveVar(false); // Track if auto-clock-out was triggered
  this.searchQuery = new ReactiveVar(''); // Initialize search query
  this.highlightExistingTickets = new ReactiveVar(false);
  this.createTicketTitle = new ReactiveVar('');
  this.showTitleField = new ReactiveVar(false);
  this.createTicketLoadingTitle = new ReactiveVar(false);
  this.ticketToDelete = new ReactiveVar(null);
  /** True when create modal was opened from clock-in → "New ticket" (auto-start ticket after create) */
  this.createTicketFromClockInNewTicket = new ReactiveVar(false);
  this.ticketIdForAssign = new ReactiveVar(null);
  this.ticketIdForHistory = new ReactiveVar(null);
  this.ticketHistoryLoading = new ReactiveVar(false);
  this.ticketHistoryError = new ReactiveVar(null);
  this.ticketHistoryData = new ReactiveVar(null);
  this.ticketHistoryRangeType = new ReactiveVar(TICKET_HISTORY_DEFAULT_RANGE);
  this.ticketHistoryCustomStartDate = new ReactiveVar(null);
  this.ticketHistoryCustomEndDate = new ReactiveVar(null);

  // GitHub browse tab state
  this.createTicketTab = new ReactiveVar('manual'); // 'manual' | 'github'
  this.githubTokenConfigured = new ReactiveVar(false);
  this.ghRepoSearchQuery = new ReactiveVar('');
  this.ghRepoResults = new ReactiveVar([]);
  this.ghReposLoading = new ReactiveVar(false);
  this.ghReposError = new ReactiveVar(null);
  this.ghSelectedRepo = new ReactiveVar(null); // 'owner/repo' string
  this.ghIssueSearchQuery = new ReactiveVar('');
  this.ghIssueResults = new ReactiveVar([]);
  this.ghIssuesLoading = new ReactiveVar(false);
  this.ghIssuesError = new ReactiveVar(null);
  this._ghRepoSearchTimer = null;
  this._ghIssueSearchTimer = null;

  // Check if user has a GitHub token
  Meteor.call('hasGitHubToken', (err, result) => {
    if (!err && result) {
      this.githubTokenConfigured.set(result.configured);
    }
  });

  // Auto-clock-out: Check every second when timer reaches 10:00:00
  this.autorun(() => {
    const teamId = selectedTeamId.get();
    const now = currentTime.get(); // This updates every second
    
    if (teamId && Meteor.userId()) {
      const activeSession = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
      
      if (activeSession && !this.autoClockOutTriggered.get()) {
        // Calculate continuous session duration in seconds
        const sessionDurationSeconds = Math.floor((now - activeSession.startTimestamp) / 1000);
        const TEN_HOURS_SECONDS = 10 * 60 * 60; // 36000 seconds
        
        // Auto-clock-out when timer reaches exactly 10:00:00 or above
        if (sessionDurationSeconds >= TEN_HOURS_SECONDS) {
          this.autoClockOutTriggered.set(true);
          
          // Calculate total duration for notification (using utility function)
          const totalSeconds = (activeSession.accumulatedTime || 0) + sessionDurationSeconds;
          const durationText = formatDurationText(totalSeconds);
          
          // Get team name for notification
          const team = Teams.findOne(teamId);
          const teamName = team?.name || 'your team';
          
          // Automatically clock out
          sessionManager.stopSession(teamId).then(() => {
            // Send push notification to user
            utils.meteorCall('notifyAutoClockOut', durationText, teamName).catch((err) => {
              console.error('Failed to send auto-clock-out notification:', err);
              // Don't fail if notification fails, just log it
            });
            
            alert('You have been automatically clocked out after 10 hours of continuous work.');
          }).catch((error) => {
            console.error('Auto-clock-out failed:', error);
            this.autoClockOutTriggered.set(false); // Reset flag if it failed
          });
        }
      } else if (!activeSession) {
        // Reset flag when there's no active session
        this.autoClockOutTriggered.set(false);
      }
    }
  });

  this.autorun(() => {
    const teams = Teams.find({}).fetch();
    const teamIds = teams.map(t => t._id);
    this.subscribe('teamTickets', teamIds);
    this.subscribe('teamMembers', teamIds);
    let teamId = selectedTeamId.get();
    if (teams.length > 0 && (!teamId || !teams.some(t => t._id === teamId))) {
      teamId = teams[0]._id;
      selectedTeamId.set(teamId);
      if (typeof localStorage !== 'undefined') localStorage.setItem('timeharbor-current-team-id', teamId);
    }
    if (teamId) {
      const activeSession = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
      if (activeSession) {
        const runningTicket = Tickets.findOne({ teamId, createdBy: Meteor.userId(), startTimestamp: { $exists: true } });
        this.activeTicketId.set(runningTicket ? runningTicket._id : null);
      } else {
        this.activeTicketId.set(null);
      }
    }
  });

  // When navigated from layout clock-in success modal (New ticket / Existing ticket)
  this.autorun(() => {
    if (Session.get('openCreateTicketModal')) {
      Session.set('openCreateTicketModal', false);
      Tracker.afterFlush(() => {
        this.editingTicket.set(null);
        this.createTicketFromClockInNewTicket.set(true);
        this.showCreateTicketForm.set(true);
        const modal = document.getElementById('createTicketModal');
        if (modal) {
          modal.showModal();
          document.getElementById('createTicketForm')?.reset();
        }
      });
    }
    if (Session.get('highlightExistingTickets')) {
      Session.set('highlightExistingTickets', false);
      this.highlightExistingTickets.set(true);
      Tracker.afterFlush(() => {
        const el = document.getElementById('existingTicketsList');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      setTimeout(() => this.highlightExistingTickets.set(false), HIGHLIGHT_DURATION_MS);
    }
  });

  this.autorun(() => {
    const ticketId = Session.get(OPEN_TICKET_HISTORY_SESSION_KEY);
    if (!ticketId) return;
    Session.set(OPEN_TICKET_HISTORY_SESSION_KEY, null);
    openTicketHistoryModal(this, ticketId);
  });
});

Template.tickets.onDestroyed(function () {
  if (this._ghRepoSearchTimer) clearTimeout(this._ghRepoSearchTimer);
  if (this._ghIssueSearchTimer) clearTimeout(this._ghIssueSearchTimer);
});

Template.tickets.helpers({
  userTeams: getUserTeams,
  showCreateTicketForm() {
    return Template.instance().showCreateTicketForm.get();
  },
  showEditTicketForm() {
    return Template.instance().showEditTicketForm.get();
  },
  editingTicket() {
    return Template.instance().editingTicket.get();
  },
  ticketToDelete() {
    return Template.instance().ticketToDelete.get();
  },
  highlightExistingTickets() {
    return Template.instance().highlightExistingTickets.get();
  },
  /** Class string for the play/start circle when "Existing ticket" highlight is active */
  activateTicketHighlightClass() {
    return Template.instance().highlightExistingTickets.get()
      ? 'ring-4 ring-primary ring-offset-2 ring-offset-base-100 animate-pulse'
      : '';
  },
  createTicketTitle() {
    return Template.instance().createTicketTitle.get();
  },
  showTitleField() {
    return Template.instance().showTitleField.get();
  },
  createTicketLoadingTitle() {
    return Template.instance().createTicketLoadingTitle.get();
  },
  tickets() {
    const teamId = selectedTeamId.get();
    if (!teamId) return [];
    
    const now = currentTime.get();
    const searchQuery = (Template.instance().searchQuery?.get() || '').toLowerCase().trim();
    const isAdmin = !!Teams.findOne({ _id: teamId, admins: Meteor.userId() });
    const query = isAdmin ? { teamId } : { teamId, createdBy: Meteor.userId() };

    return Tickets.find(query).fetch()
      .filter(ticket => !searchQuery || ticket.title.toLowerCase().includes(searchQuery))
      .map(ticket => {
        const isActive = !!ticket.startTimestamp;
        const sessionElapsed = isActive ? Math.max(0, Math.floor((now - ticket.startTimestamp) / 1000)) : 0;
        const assigneeId = ticket.assignedTo;
        const assigneeName = assigneeId ? getUserName(assigneeId) : 'Unassigned';
        const assigneeInitial = assigneeName === 'Unassigned' ? '—' : assigneeName.split(/\s+/).map(s => s[0]).join('').toUpperCase().slice(0, 2) || '?';

        return {
          ...ticket,
          sessionElapsed,
          assigneeName,
          assigneeInitial
        };
      });
  },
  isTeamAdminForSelectedTeam() {
    const teamId = selectedTeamId.get();
    return teamId ? !!Teams.findOne({ _id: teamId, admins: Meteor.userId() }) : false;
  },
  teamMembersForAssign() {
    const teamId = selectedTeamId.get();
    if (!teamId) return [];
    const team = Teams.findOne(teamId);
    if (!team) return [];
    const ids = [...(team.members || []), ...(team.admins || [])].filter(Boolean);
    return ids.map(userId => {
      const name = getUserName(userId);
      const initial = name ? name.charAt(0).toUpperCase() : '?';
      return { _id: userId, name, initial };
    }).filter(m => m.name);
  },
  ticketIdForAssign() {
    return Template.instance().ticketIdForAssign?.get() || null;
  },
  ticketTitleForAssign() {
    const id = Template.instance().ticketIdForAssign?.get();
    if (!id) return '';
    const t = Tickets.findOne(id);
    return t ? t.title : '';
  },
  ticketIdForHistory() {
    return Template.instance().ticketIdForHistory?.get() || null;
  },
  ticketTitleForHistory() {
    const id = Template.instance().ticketIdForHistory?.get();
    if (!id) return '';
    const t = Tickets.findOne(id);
    return t ? t.title : '';
  },
  ticketHistoryLoading() {
    return Template.instance().ticketHistoryLoading?.get() || false;
  },
  ticketHistoryError() {
    return Template.instance().ticketHistoryError?.get() || null;
  },
  ticketHistoryData() {
    return Template.instance().ticketHistoryData?.get() || null;
  },
  ticketHistoryDisplayTotalSeconds() {
    const data = Template.instance().ticketHistoryData?.get();
    if (!data) return 0;
    const nowMs = currentTime.get();
    const liveDelta = getLiveHistoryDeltaSeconds(data, nowMs);
    return (data.totalSeconds || 0) + liveDelta;
  },
  ticketHistoryDisplayRangeSeconds() {
    const data = Template.instance().ticketHistoryData?.get();
    if (!data) return 0;
    const nowMs = currentTime.get();
    const liveDelta = getLiveRangeDeltaSeconds(data, nowMs);
    return (data.rangeSeconds || 0) + liveDelta;
  },
  ticketHistoryDisplayTotalLabel() {
    const data = Template.instance().ticketHistoryData?.get();
    if (!data) return '0s';
    const nowMs = currentTime.get();
    const liveDelta = getLiveHistoryDeltaSeconds(data, nowMs);
    return formatDurationText((data.totalSeconds || 0) + liveDelta);
  },
  ticketHistoryDisplayRangeLabel() {
    const data = Template.instance().ticketHistoryData?.get();
    if (!data) return '0s';
    const nowMs = currentTime.get();
    const liveDelta = getLiveRangeDeltaSeconds(data, nowMs);
    return formatDurationText((data.rangeSeconds || 0) + liveDelta);
  },
  hasTicketHistorySessions() {
    const data = Template.instance().ticketHistoryData?.get();
    return !!(data && Array.isArray(data.selectedSessions) && data.selectedSessions.length > 0);
  },
  hasTicketHistoryDailyTotals() {
    const data = Template.instance().ticketHistoryData?.get();
    return !!(data && Array.isArray(data.dailyTotals) && data.dailyTotals.length > 0);
  },
  ticketHistoryRangeType() {
    return Template.instance().ticketHistoryRangeType?.get() || TICKET_HISTORY_DEFAULT_RANGE;
  },
  ticketHistoryRangeOptions() {
    const current = Template.instance().ticketHistoryRangeType?.get() || TICKET_HISTORY_DEFAULT_RANGE;
    return TICKET_HISTORY_RANGES.map((range) => ({
      ...range,
      selected: range.value === current
    }));
  },
  ticketHistoryCustomStartDate() {
    return Template.instance().ticketHistoryCustomStartDate?.get() || '';
  },
  ticketHistoryCustomEndDate() {
    return Template.instance().ticketHistoryCustomEndDate?.get() || '';
  },
  ticketHistoryRangeButtonClass(range) {
    const current = Template.instance().ticketHistoryRangeType?.get() || TICKET_HISTORY_DEFAULT_RANGE;
    const base = 'ticket-history-range-btn px-3 py-1.5 rounded-full border text-xs font-medium transition-colors';
    if (current === range) {
      return `${base} bg-blue-600 text-white border-blue-600`;
    }
    return `${base} text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-600`; 
  },
  isTicketHistoryCustomRange() {
    return (Template.instance().ticketHistoryRangeType?.get() || TICKET_HISTORY_DEFAULT_RANGE) === 'custom';
  },
  ticketHistoryCustomDateAttrs() {
    const isCustom = (Template.instance().ticketHistoryRangeType?.get() || TICKET_HISTORY_DEFAULT_RANGE) === 'custom';
    return isCustom ? {} : { disabled: true };
  },
  ticketHistoryCustomRangeInputAttrs() {
    const isCustom = (Template.instance().ticketHistoryRangeType?.get() || TICKET_HISTORY_DEFAULT_RANGE) === 'custom';
    return isCustom ? {} : { disabled: true };
  },
  isTicketHistorySingleDayRange() {
    const rangeType = Template.instance().ticketHistoryRangeType?.get() || TICKET_HISTORY_DEFAULT_RANGE;
    return rangeType !== 'last7';
  },
  isActive(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    return ticket && ticket.startTimestamp && !ticket.endTime;
  },
  formatTime,
  formatDurationText,
  githubLink(github) {
    return normalizeReferenceUrl(github) || '';
  },
  hasReferenceUrl(github) {
    if (!github || typeof github !== 'string') return false;
    return github.trim().length > 0;
  },
  ticketRowRefClass(github) {
    // No longer making row clickable - use the open-in-new-tab button instead
    return '';
  },
  isClockedIn() {
    return Template.instance().clockedIn.get();
  },
  selectedTeamId() {
    return selectedTeamId.get();
  },
  isClockedInForTeam(teamId) {
    return !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
  },
  isClockedInForCurrentTeam() {
    const teamId = selectedTeamId.get();
    return teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;
  },
  currentActiveTicketInfo() {
    const activeTicketId = Template.instance().activeTicketId.get();
    if (!activeTicketId) return null;
    
    const ticket = Tickets.findOne(activeTicketId);
    return ticket ? {
      id: ticket._id,
      title: ticket.title,
      isRunning: !!ticket.startTimestamp
    } : null;
  },
  getButtonClasses(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = selectedTeamId.get();
    const hasActiveSession = teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;
    
    if (isActive) return 'btn btn-outline btn-primary';
    if (hasActiveSession) return 'btn btn-outline btn-primary';
    return 'btn btn-disabled';
  },
  getButtonTooltip(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = selectedTeamId.get();
    const hasActiveSession = teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;
    const canControl = ticket && ticket.createdBy === Meteor.userId();
    if (!canControl) return 'Only the ticket creator can start/stop this ticket';
    if (isActive) return 'Click to stop this activity';
    if (hasActiveSession) return 'Click to start this activity';
    return 'Start a session first to begin activities';
  },
  canControlTicket(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    return ticket && ticket.createdBy === Meteor.userId();
  },
  activateTicketButtonClass(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    const isActive = ticket && ticket.startTimestamp && !ticket.endTime;
    const teamId = selectedTeamId.get();
    const isClockedIn = teamId ? !!ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null }) : false;
    const canControl = ticket && ticket.createdBy === Meteor.userId();
    let c = isActive
      ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'
      : 'bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-600 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-400';
    if (!isClockedIn || !canControl) c += ' opacity-50 cursor-not-allowed';
    else c += ' cursor-pointer';
    return c;
  },
  activateTicketDisabledAttrs(ticketId) {
    const ticket = Tickets.findOne(ticketId);
    const canControl = ticket && ticket.createdBy === Meteor.userId();
    return canControl ? {} : { disabled: 'disabled' };
  },
  shortTicketId(ticketId) {
    if (!ticketId) return '';
    return ticketId.substring(0, 8);
  },
  // GitHub browse tab helpers
  isManualTab() {
    return Template.instance().createTicketTab.get() !== 'github';
  },
  isGithubTab() {
    return Template.instance().createTicketTab.get() === 'github';
  },
  githubTokenConfigured() {
    return Template.instance().githubTokenConfigured.get();
  },
  ghRepoResults() {
    return Template.instance().ghRepoResults.get();
  },
  ghReposLoading() {
    return Template.instance().ghReposLoading.get();
  },
  ghReposError() {
    return Template.instance().ghReposError.get();
  },
  ghSelectedRepo() {
    return Template.instance().ghSelectedRepo.get();
  },
  ghIssueResults() {
    return Template.instance().ghIssueResults.get();
  },
  ghIssuesLoading() {
    return Template.instance().ghIssuesLoading.get();
  },
  ghIssuesError() {
    return Template.instance().ghIssuesError.get();
  }
});

Template.tickets.events({
  'input #searchTickets'(e, t) {
    t.searchQuery.set(e.target.value);
  },
  'click #showCreateTicketForm'(e, t) {
    t.editingTicket.set(null);
    t.createTicketFromClockInNewTicket.set(false);
    t.createTicketTitle.set('');
    t.showTitleField.set(false);
    t.createTicketLoadingTitle.set(false);
    t.showCreateTicketForm.set(true);
    resetGitHubBrowseState(t);
    Tracker.afterFlush(() => {
      const modal = document.getElementById('createTicketModal');
      if (modal) {
        const onClose = () => {
          resetCreateTicketModal(t);
          modal.removeEventListener('close', onClose);
        };
        modal.addEventListener('close', onClose);
        modal.showModal();
        const form = document.getElementById('createTicketForm');
        if (form) form.reset();
      }
    });
  },
  'click #closeCreateTicketModal'(e, t) {
    document.getElementById('createTicketModal')?.close();
    resetCreateTicketModal(t);
  },
  'click #createTicketModalBackdropClose'(e, t) {
    document.getElementById('createTicketModal')?.close();
    resetCreateTicketModal(t);
  },
  'click #cancelCreateTicket'(e, t) {
    document.getElementById('createTicketModal')?.close();
    resetCreateTicketModal(t);
  },
  'input #createTicketTitle'(e, t) {
    t.createTicketTitle.set(e.target.value);
  },
  'input #createTicketGithub'(e, t) {
    processCreateTicketGithubInput(e.target.value, t);
  },
  'paste #createTicketGithub'(e, t) {
    setTimeout(() => processCreateTicketGithubInput(t.find('#createTicketGithub')?.value || '', t), 0);
  },

  // GitHub browse tab events
  'click .create-ticket-tab'(e, t) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab) return;
    t.createTicketTab.set(tab);
    if (tab === 'github') {
      // Re-check token status and load default repos
      Meteor.call('hasGitHubToken', (err, result) => {
        if (!err && result) {
          t.githubTokenConfigured.set(result.configured);
          if (result.configured) {
            searchGitHubRepos(t, '');
          }
        }
      });
    }
  },
  'input #ghRepoSearch'(e, t) {
    const query = e.target.value;
    t.ghRepoSearchQuery.set(query);
    searchGitHubRepos(t, query);
  },
  'click .gh-select-repo'(e, t) {
    const owner = e.currentTarget.dataset.owner;
    const repo = e.currentTarget.dataset.repo;
    const fullName = e.currentTarget.dataset.fullName;
    if (!owner || !repo) return;
    t.ghSelectedRepo.set(fullName);
    t.ghIssueSearchQuery.set('');
    t.ghIssueResults.set([]);
    loadGitHubIssues(t, '');
  },
  'click #ghBackToRepos'(e, t) {
    clearSelectedRepo(t);
  },
  'input #ghIssueSearch'(e, t) {
    const query = e.target.value;
    t.ghIssueSearchQuery.set(query);
    loadGitHubIssues(t, query);
  },
  'click .gh-select-issue'(e, t) {
    const issueUrl = e.currentTarget.dataset.url;
    const issueTitle = e.currentTarget.dataset.title;
    const issueNumber = e.currentTarget.dataset.number;
    if (!issueUrl || !issueTitle) return;

    // Switch to manual tab with the issue pre-filled
    t.createTicketTab.set('manual');
    t.createTicketTitle.set(issueTitle);
    t.showTitleField.set(true);
    t.createTicketLoadingTitle.set(false);

    // Pre-fill the form fields after DOM updates
    Tracker.afterFlush(() => {
      const githubInput = document.getElementById('createTicketGithub');
      const titleInput = document.getElementById('createTicketTitle');
      if (githubInput) githubInput.value = issueUrl;
      if (titleInput) titleInput.value = issueTitle;
    });
  },

  'click .open-ticket-newtab-btn'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const url = e.currentTarget.dataset.url;
    if (url) {
      // Always open in new tab, never fallback to same tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  },
  'click .edit-ticket-btn'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const ticketId = e.currentTarget.dataset.id;
    const ticket = Tickets.findOne(ticketId);
    if (ticket) {
      t.editingTicket.set(ticket);
      t.showCreateTicketForm.set(true);
      // Pre-fill form with existing ticket data
      t.createTicketTitle.set(ticket.title || '');
      t.showTitleField.set(true);
      t.createTicketLoadingTitle.set(false);
      Tracker.afterFlush(() => {
        const modal = document.getElementById('createTicketModal');
        if (modal) {
          const onClose = () => {
            resetCreateTicketModal(t);
            modal.removeEventListener('close', onClose);
          };
          modal.addEventListener('close', onClose);
          modal.showModal();
          const form = document.getElementById('createTicketForm');
          if (form) {
            form.reset();
            const githubInput = form.querySelector('#createTicketGithub');
            const titleInput = form.querySelector('#createTicketTitle');
            if (githubInput && ticket.github) githubInput.value = ticket.github;
            if (titleInput && ticket.title) titleInput.value = ticket.title;
          }
        }
      });
    }
  },

  'click .delete-ticket-btn'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const ticketId = e.currentTarget.dataset.id;
    const ticket = Tickets.findOne(ticketId);
    if (!ticket) return;

    t.ticketToDelete.set(ticket);
    Tracker.afterFlush(() => {
      const modal = document.getElementById('deleteTicketModal');
      if (modal) {
        modal.showModal();
      }
    });
  },
  'click #cancelDeleteTicket'(e, t) {
    document.getElementById('deleteTicketModal')?.close();
    t.ticketToDelete.set(null);
  },
  'click #confirmDeleteTicket'(e, t) {
    const ticket = t.ticketToDelete.get();
    if (!ticket) return;

    const deleteTicket = async () => {
      try {
        await utils.meteorCall('deleteTicket', ticket._id);
        document.getElementById('deleteTicketModal')?.close();
        t.ticketToDelete.set(null);
      } catch (error) {
        utils.handleError(error, 'Error deleting ticket');
      }
    };

    deleteTicket();
  },
  'click #closeDeleteTicketModal'(e, t) {
    document.getElementById('deleteTicketModal')?.close();
    t.ticketToDelete.set(null);
  },
  'click #deleteTicketModalBackdropClose'(e, t) {
    document.getElementById('deleteTicketModal')?.close();
    t.ticketToDelete.set(null);
  },

  'click .assign-ticket-btn'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const ticketId = e.currentTarget.dataset.id;
    t.ticketIdForAssign.set(ticketId);
    Tracker.afterFlush(() => {
      const modal = document.getElementById('assignTicketModal');
      if (modal) modal.showModal();
    });
  },
  'click .assign-to-member-btn'(e, t) {
    e.preventDefault();
    const ticketId = t.ticketIdForAssign.get();
    const userId = e.currentTarget.dataset.userId;
    if (!ticketId) return;
    Meteor.call('assignTicket', ticketId, userId || null, (err) => {
      if (err) {
        utils.handleError(err, 'Failed to assign ticket');
        return;
      }
      document.getElementById('assignTicketModal')?.close();
      t.ticketIdForAssign.set(null);
    });
  },
  'click #closeAssignTicketModal'(e, t) {
    document.getElementById('assignTicketModal')?.close();
    t.ticketIdForAssign.set(null);
  },
  'click #cancelAssignTicket'(e, t) {
    document.getElementById('assignTicketModal')?.close();
    t.ticketIdForAssign.set(null);
  },

  'click .show-ticket-history-btn'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const ticketId = e.currentTarget.dataset.id;
    if (!ticketId) return;
    openTicketHistoryModal(t, ticketId);
  },
  'click #closeTicketHistoryModal'(e, t) {
    document.getElementById('ticketHistoryModal')?.close();
  },
  'click #closeTicketHistoryBtn'(e, t) {
    document.getElementById('ticketHistoryModal')?.close();
  },
  'click #ticketHistoryModalBackdropClose'(e, t) {
    document.getElementById('ticketHistoryModal')?.close();
  },
  'change #ticketHistoryRangeSelect'(e, t) {
    const range = e.currentTarget.value;
    if (!range) return;
    t.ticketHistoryRangeType.set(range);
    if (range !== 'custom') {
      loadTicketHistory(t);
    } else {
      document.getElementById('ticketHistoryCustomStartDate')?.focus();
    }
  },
  'change #ticketHistoryCustomStartDate, change #ticketHistoryCustomEndDate'(e, t) {
    const startDate = document.getElementById('ticketHistoryCustomStartDate')?.value || '';
    const endDate = document.getElementById('ticketHistoryCustomEndDate')?.value || '';
    t.ticketHistoryCustomStartDate.set(startDate || null);
    t.ticketHistoryCustomEndDate.set(endDate || null);

    if (startDate && endDate) {
      if (t.ticketHistoryRangeType.get() !== 'custom') t.ticketHistoryRangeType.set('custom');
      loadTicketHistory(t);
    }
  },

  async 'submit #createTicketForm'(e, t) {
    e.preventDefault();
    const editingTicket = t.editingTicket.get();
    const github = (e.target.github?.value || '').trim();
    const titleInput = e.target.title;
    const title = titleInput ? titleInput.value.trim() : '';
    const titleFromState = t.createTicketTitle.get();
    const finalTitle = title || titleFromState;
    
    if (!finalTitle) {
      alert('Please paste a GitHub issue link to auto-fill the title, or enter a title.');
      return;
    }
    
    try {
      if (editingTicket) {
        // Update existing ticket
        await utils.meteorCall('updateTicket', editingTicket._id, {
          title: finalTitle,
          github
        });
      } else {
        // Create new ticket
        const teamId = selectedTeamId.get();
        const newTicketId = await utils.meteorCall('createTicket', {
          teamId,
          title: finalTitle,
          github,
          accumulatedTime: 0
        });
        const fromClockInNewTicket = t.createTicketFromClockInNewTicket.get();
        if (fromClockInNewTicket && newTicketId) {
          const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
          if (clockEvent) {
            await ticketManager.startTicket(newTicketId, t, clockEvent);
          }
        }
        t.createTicketFromClockInNewTicket.set(false);
      }
      document.getElementById('createTicketModal')?.close();
      t.showCreateTicketForm.set(false);
      t.editingTicket.set(null);
      t.createTicketTitle.set('');
      t.showTitleField.set(false);
      t.createTicketLoadingTitle.set(false);
      e.target.reset();
    } catch (error) {
      utils.handleError(error, editingTicket ? 'Error updating ticket' : 'Error creating ticket');
    }
  },
  
  async 'click .activate-ticket'(e, t) {
    const ticketId = e.currentTarget.dataset.id;
    const ticket = Tickets.findOne(ticketId);
    if (!ticket || ticket.createdBy !== Meteor.userId()) return;
    const isActive = ticket.startTimestamp && !ticket.endTime;
    const teamId = selectedTeamId.get();
    const clockEvent = ClockEvents.findOne({ userId: Meteor.userId(), teamId, endTime: null });
    
    if (!isActive) {
      if (!clockEvent) {
        alert('Please start a session before starting an activity.');
        return;
      }
      
      await ticketManager.startTicket(ticketId, t, clockEvent);
    } else {
      await ticketManager.stopTicket(ticketId, clockEvent);
    }
  },
  
  });