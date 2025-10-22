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
      name: queriedTeam.name,
      code: queriedTeam.code,
      members: Template.instance().selectedTeamUsers.get(),
      admins: queriedTeam.admins,
      leader: queriedTeam.leader,
      createdAt: queriedTeam.createdAt,
    };
  },
  isAdmin(teamId) {
    const team = Teams.findOne(teamId);
    const userId = Meteor.userId();
    return !!(team && Array.isArray(team.admins) && userId && team.admins.includes(userId));
  },
});

Template.teams.events({
  'click #showCreateTeamForm'(e, t) {
    t.showCreateTeam.set(true);
    t.showJoinTeam && t.showJoinTeam.set(false);
  },
  'click #showJoinTeamForm'(e, t) {
    t.showJoinTeam.set(true);
    t.showCreateTeam && t.showCreateTeam.set(false);
  },
  'click #cancelCreateTeam'(e, t) {
    t.showCreateTeam.set(false);
  },
  'click #cancelJoinTeam'(e, t) {
    t.showJoinTeam.set(false);
  },
  'submit #createTeamForm'(e, t) {
    e.preventDefault();
    const teamName = e.target.teamName.value;
    Meteor.call('createTeam', teamName, (err) => {
      if (!err) {
        t.showCreateTeam.set(false);
      } else {
        alert('Error creating team: ' + err.reason);
      }
    });
  },
  'submit #joinTeamForm'(e, t) {
    e.preventDefault();
    const teamCode = e.target.teamCode.value;
    Meteor.call('joinTeamWithCode', teamCode, (err) => {
      if (!err) {
        t.showJoinTeam.set(false);
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
    t.selectedTeamUsers.set([]); // Clear users when going back
  },
  'click #copyTeamCode'(e, t) {
    const teamId = Template.instance().selectedTeamId.get();
    const joinCode = Teams.findOne(teamId)?.code;
    if (joinCode) {
      navigator.clipboard.writeText(joinCode)
        .then(() => {
          const btn = e.currentTarget;
          const originalText = btn.textContent;
          const originalClasses = btn.className;
          
          // Change to green success button
          btn.textContent = 'Copied!';
          btn.className = 'btn btn-sm btn-success';
          
          // Reset after 2 seconds
          setTimeout(() => {
            btn.textContent = originalText;
            btn.className = originalClasses;
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          alert('Failed to copy code to clipboard');
        });
    }
  },
  'click .edit-team-btn'(e, t) {
    e.preventDefault();
    const teamId = e.currentTarget.dataset.id;
    const team = Teams.findOne(teamId);
    const currentName = team?.name || '';
    const newName = prompt('Edit Team Name', currentName);
    if (newName && newName.trim() && newName !== currentName) {
      Meteor.call('updateTeamName', teamId, newName.trim(), (err) => {
        if (err) {
          alert('Error updating team: ' + (err.reason || err.message));
        }
      });
    }
  },
  'click .delete-team-btn'(e, t) {
    e.preventDefault();
    const teamId = e.currentTarget.dataset.id;
    const team = Teams.findOne(teamId);
    const name = team?.name || 'this team';
    if (confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) {
      Meteor.call('deleteTeam', teamId, (err) => {
        if (err) {
          alert('Error deleting team: ' + (err.reason || err.message));
        }
      });
    }
  },
});