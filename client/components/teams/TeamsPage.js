import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
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
    const instance = Template.instance();
    const id = instance.selectedTeamId.get();
    const queriedTeam = id ? Teams.findOne(id) : null;
    if (!queriedTeam) return null;

    const users = instance.selectedTeamUsers.get() || [];
    const admins = queriedTeam.admins || [];

    const membersWithRoles = users.map((user) => ({
      ...user,
      isAdmin: admins.includes(user.id),
    }));

    return {
      _id: queriedTeam._id,
      name: queriedTeam.name,
      code: queriedTeam.code,
      members: membersWithRoles,
      admins,
      createdAt: queriedTeam.createdAt,
    };
  },
  isAdmin(teamId) {
    const team = Teams.findOne(teamId);
    const userId = Meteor.userId();
    return !!(team && Array.isArray(team.admins) && userId && team.admins.includes(userId));
  },
  // Is the current user an admin for the currently selected team?
  currentUserIsAdminForSelectedTeam() {
    const instance = Template.instance();
    const id = instance.selectedTeamId.get();
    const team = id ? Teams.findOne(id) : null;
    const userId = Meteor.userId();
    return !!(team && Array.isArray(team.admins) && userId && team.admins.includes(userId));
  },
  // Check if a user ID is the current user
  isCurrentUser(userId) {
    return userId === Meteor.userId();
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
  // Promote a member to admin
  'click .make-admin-btn'(e, t) {
    e.preventDefault();
    const teamId = t.selectedTeamId.get();
    const userId = e.currentTarget.dataset.id;
    if (!teamId || !userId) return;

    Meteor.call('addTeamAdmin', teamId, userId, (err) => {
      if (err) {
        alert('Error making admin: ' + (err.reason || err.message));
      }
    });
  },
  // Set a password for a team member (admin-only)
  'click .set-password-btn'(e, t) {
    e.preventDefault();
    const teamId = t.selectedTeamId.get();
    const userId = e.currentTarget.dataset.id;
    if (!teamId || !userId) return;

    const user = t.selectedTeamUsers.get().find(u => u.id === userId);
    const userName = user?.name || user?.email || 'this user';

    const newPassword = prompt(`Set a new password for ${userName}. Minimum 6 characters:`);
    if (!newPassword) return;
    if (newPassword.trim().length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    const confirmPassword = prompt('Confirm the new password:');
    if (confirmPassword !== newPassword) {
      alert('Passwords do not match.');
      return;
    }

    Meteor.call('setTeamMemberPassword', { teamId, userId, newPassword }, (err) => {
      if (err) {
        alert('Error setting password: ' + (err.reason || err.message));
      } else {
        alert(`Password updated for ${userName}.`);
      }
    });
  },
  // Remove admin status from a co-admin
  'click .remove-admin-btn'(e, t) {
    e.preventDefault();
    const teamId = t.selectedTeamId.get();
    const userId = e.currentTarget.dataset.id;
    if (!teamId || !userId) return;

    const user = t.selectedTeamUsers.get().find(u => u.id === userId);
    const userName = user?.name || user?.email || 'this user';
    
    if (!confirm(`Are you sure you want to remove admin status from ${userName}? They will lose all admin privileges.`)) {
      return;
    }

    Meteor.call('removeTeamAdmin', teamId, userId, (err) => {
      if (err) {
        alert('Error removing admin: ' + (err.reason || err.message));
      }
    });
  },
  // Handle member name click - navigate to member activity page
  'click .member-name-link'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const userId = e.currentTarget.getAttribute('data-user-id');
    // Get teamId from template instance instead of HTML attribute
    const teamId = t.selectedTeamId.get();
    
    if (userId && teamId) {
      FlowRouter.go(`/member/${teamId}/${userId}`);
    }
  },
});