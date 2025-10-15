import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams } from '../../../collections.js';
import { getUserTeams } from '../../utils/UserTeamUtils.js';

Template.teams.onCreated(function () {
  this.showCreateTeam = new ReactiveVar(false);
  this.showJoinTeam = new ReactiveVar(false);
  this.selectedTeamId = new ReactiveVar(null);
  this.selectedTeamUsers = new ReactiveVar([]);

  this.autorun(() => {
    const selectedId = this.selectedTeamId.get();
    if (selectedId) {
      this.subscribe('teamDetails', selectedId);
      const team = Teams.findOne(selectedId);
      if (team && team.members && team.members.length > 0) {
        Meteor.call('getUsers', team.members, (err, users) => {
          if (!err) {
            this.selectedTeamUsers.set(users);
          } else {
            this.selectedTeamUsers.set([]);
          }
        });
      } else {
        this.selectedTeamUsers.set([]);
      }
    } else {
      this.selectedTeamUsers.set([]);
    }
  });
});

Template.teams.onDestroyed(function () {
  // Clean up ReactiveVars
  this.showCreateTeam.set(false);
  this.showJoinTeam.set(false);
  this.selectedTeamId.set(null);
  this.selectedTeamUsers.set([]);
});

Template.teams.helpers({
  showCreateTeam() {
    return Template.instance().showCreateTeam.get();
  },
  showJoinTeam() {
    return Template.instance().showJoinTeam.get();
  },
  userTeams: getUserTeams,
  selectedTeam() {
    const id = Template.instance().selectedTeamId.get();
    const queriedTeam = id ? Teams.findOne(id) : null;
    if (!queriedTeam) return null;
    return {
      _id: queriedTeam._id,
      name: queriedTeam.name,
      code: queriedTeam.code,
      members: Template.instance().selectedTeamUsers.get(),
    };
  },
  canManageTeam(teamId) {
    const team = Teams.findOne(teamId);
    if (!team) return false;
    const userId = Meteor.userId();
    if (!userId) return false;
    const admins = team.admins || [];
    return admins.includes(userId) || team.leader === userId;
  },
});

Template.teams.events({
  'click #showCreateTeamForm'(e, t) {
    t.showCreateTeam.set(true);
    t.showJoinTeam.set(false);
  },
  'click #showJoinTeamForm'(e, t) {
    t.showJoinTeam.set(true);
    t.showCreateTeam.set(false);
  },
  'click #cancelCreateTeam'(e, t) {
    t.showCreateTeam.set(false);
  },
  'click #cancelJoinTeam'(e, t) {
    t.showJoinTeam.set(false);
  },
  'submit #createTeamForm'(e, t) {
    e.preventDefault();
    const teamName = e.target.teamName.value?.trim();
    if (!teamName) {
      alert('Please enter a team name');
      return;
    }
    Meteor.call('createTeam', teamName, (err) => {
      if (!err) {
        t.showCreateTeam.set(false);
        e.target.reset();
      } else {
        alert('Error creating team: ' + err.reason);
      }
    });
  },
  'submit #joinTeamForm'(e, t) {
    e.preventDefault();
    const teamCode = e.target.teamCode.value?.trim().toUpperCase();
    if (!teamCode) {
      alert('Please enter a team code');
      return;
    }
    Meteor.call('joinTeamWithCode', teamCode, (err) => {
      if (!err) {
        t.showJoinTeam.set(false);
        e.target.reset();
      } else {
        alert('Error joining team: ' + err.reason);
      }
    });
  },
  'click .team-link'(e, t) {
    e.preventDefault();
    t.selectedTeamId.set(e.currentTarget.dataset.id);
  },
  'click #backToTeams'(e, t) {
    t.selectedTeamId.set(null);
    t.selectedTeamUsers.set([]);
  },
  'click #copyTeamCode'(e, t) {
    const teamId = t.selectedTeamId.get();
    const joinCode = Teams.findOne(teamId)?.code;
    if (!joinCode) return;
    
    navigator.clipboard.writeText(joinCode)
      .then(() => {
        const btn = e.currentTarget;
        const originalText = btn.textContent;
        const originalClasses = btn.className;
        
        btn.textContent = 'Copied!';
        btn.className = 'btn btn-sm btn-success';
        
        setTimeout(() => {
          btn.textContent = originalText;
          btn.className = originalClasses;
        }, 2000);
      })
      .catch(() => {
        alert('Failed to copy code to clipboard');
      });
  },
  'click .rename-team-btn'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const teamId = e.currentTarget.dataset.id;
    const team = Teams.findOne(teamId);
    if (!team) return;
    const newName = prompt('Enter new team name:', team.name);
    if (!newName || newName.trim() === '' || newName === team.name) return;
    Meteor.call('renameTeam', teamId, newName.trim(), (err) => {
      if (err) {
        alert('Error renaming team: ' + err.reason);
      }
    });
  },
  'click .delete-team-btn'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const teamId = e.currentTarget.dataset.id;
    const team = Teams.findOne(teamId);
    if (!team) return;
    const confirmed = confirm(`Are you sure you want to delete team "${team.name}"? This cannot be undone.`);
    if (!confirmed) return;
    Meteor.call('deleteTeam', teamId, (err) => {
      if (err) {
        alert('Error deleting team: ' + err.reason);
      } else if (t.selectedTeamId.get() === teamId) {
        t.selectedTeamId.set(null);
        t.selectedTeamUsers.set([]);
      }
    });
  },
});