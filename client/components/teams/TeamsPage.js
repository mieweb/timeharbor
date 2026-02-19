import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Teams } from '../../../collections.js';
import { selectedTeamId } from '../layout/MainLayout.js';

Template.teams.onCreated(function () {
  this.isJoinModalOpen = new ReactiveVar(false);
  this.isCreateModalOpen = new ReactiveVar(false);
  this.createdTeamCode = new ReactiveVar(null); // after create, show code in modal
  this.joinError = new ReactiveVar(null);
  this.selectedTeamUsers = new ReactiveVar([]);

  this.isEditModalOpen = new ReactiveVar(false);
  this.isDeleteModalOpen = new ReactiveVar(false);
  this.isRemoveMemberModalOpen = new ReactiveVar(false);
  this.editingTeamName = new ReactiveVar('');
  this.memberToRemove = new ReactiveVar(null);

  // Use header's selected team as "current team"
  this.autorun(() => {
    const selectedId = selectedTeamId.get();
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
  // Current team from header switcher
  selectedTeam() {
    const id = selectedTeamId.get();
    const queriedTeam = id ? Teams.findOne(id) : null;
    if (!queriedTeam) return null;

    const users = Template.instance().selectedTeamUsers.get() || [];
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
  currentUserIsAdminForSelectedTeam() {
    const id = selectedTeamId.get();
    const team = id ? Teams.findOne(id) : null;
    const userId = Meteor.userId();
    return !!(team && Array.isArray(team.admins) && userId && team.admins.includes(userId));
  },
  isCurrentUser(userId) {
    return userId === Meteor.userId();
  },
  memberInitial(member) {
    if (!member) return '?';
    const s = member.name || member.email || '';
    return s ? s.charAt(0).toUpperCase() : '?';
  },
  // Modals
  isJoinModalOpen() {
    return Template.instance().isJoinModalOpen.get();
  },
  isCreateModalOpen() {
    return Template.instance().isCreateModalOpen.get();
  },
  createdTeamCode() {
    return Template.instance().createdTeamCode.get();
  },
  joinError() {
    return Template.instance().joinError.get();
  },
  isEditModalOpen() {
    return Template.instance().isEditModalOpen.get();
  },
  isDeleteModalOpen() {
    return Template.instance().isDeleteModalOpen.get();
  },
  isRemoveMemberModalOpen() {
    return Template.instance().isRemoveMemberModalOpen.get();
  },
  editingTeamName() {
    return Template.instance().editingTeamName.get();
  },
  memberToRemove() {
    return Template.instance().memberToRemove.get();
  },
});

Template.teams.events({
  'click #showJoinTeamForm'(e, t) {
    t.joinError.set(null);
    t.isJoinModalOpen.set(true);
    Tracker.afterFlush(() => {
      document.getElementById('joinTeamModal')?.showModal();
      const input = document.getElementById('joinTeamCodeInput');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
  },
  'click #showCreateTeamForm'(e, t) {
    t.createdTeamCode.set(null);
    t.isCreateModalOpen.set(true);
    Tracker.afterFlush(() => {
      document.getElementById('createTeamModal')?.showModal();
      const input = document.getElementById('createTeamNameInput');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
  },
  'click #closeJoinModal, click #closeJoinModal2, click #joinModalBackdrop'(e, t) {
    document.getElementById('joinTeamModal')?.close();
    t.isJoinModalOpen.set(false);
    t.joinError.set(null);
  },
  'click #closeCreateModal, click #closeCreateModal2, click #createModalBackdrop'(e, t) {
    document.getElementById('createTeamModal')?.close();
    t.isCreateModalOpen.set(false);
    t.createdTeamCode.set(null);
  },
  'submit #joinTeamForm'(e, t) {
    e.preventDefault();
    const code = (e.target.teamCode?.value || '').trim().toUpperCase();
    if (!code) return;
    t.joinError.set(null);
    Meteor.call('joinTeamWithCode', code, (err, teamId) => {
      if (err) {
        t.joinError.set(err.reason || err.message);
        return;
      }
      document.getElementById('joinTeamModal')?.close();
      t.isJoinModalOpen.set(false);
      if (teamId && typeof localStorage !== 'undefined') {
        selectedTeamId.set(teamId);
        localStorage.setItem('timeharbor-current-team-id', teamId);
      }
    });
  },
  'submit #createTeamForm'(e, t) {
    e.preventDefault();
    const teamName = (e.target.teamName?.value || '').trim();
    if (!teamName) return;
    Meteor.call('createTeam', teamName, (err, result) => {
      if (err) {
        alert('Error creating team: ' + (err.reason || err.message));
        return;
      }
      const { teamId, code } = result || {};
      t.createdTeamCode.set(code || '');
      if (teamId && typeof localStorage !== 'undefined') {
        selectedTeamId.set(teamId);
        localStorage.setItem('timeharbor-current-team-id', teamId);
      }
    });
  },
  'click #createTeamDone'(e, t) {
    document.getElementById('createTeamModal')?.close();
    t.isCreateModalOpen.set(false);
    t.createdTeamCode.set(null);
  },
  'click #copyCreatedCode'(e, t) {
    const code = t.createdTeamCode.get();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      const btn = e.currentTarget;
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }).catch(() => alert('Failed to copy'));
  },
  'click #copyTeamCode'(e, t) {
    const teamId = selectedTeamId.get();
    const joinCode = Teams.findOne(teamId)?.code;
    if (joinCode) {
      navigator.clipboard.writeText(joinCode)
        .then(() => {
          const btn = e.currentTarget;
          const originalHTML = btn.innerHTML;
          const originalClasses = btn.className;
          btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> Copied!';
          btn.className = 'copy-team-code-btn flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 dark:bg-green-500 rounded-lg border-0';
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.className = originalClasses;
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          alert('Failed to copy code to clipboard');
        });
    }
  },
  'click #openEditTeam'(e, t) {
    const team = Teams.findOne(selectedTeamId.get());
    if (team) {
      const name = team.name || '';
      t.editingTeamName.set(name);
      t.isEditModalOpen.set(true);
      Tracker.afterFlush(() => {
        const modal = document.getElementById('editTeamModal');
        const input = document.getElementById('editTeamNameInput');
        if (input) input.value = name;
        modal?.showModal();
      });
    }
  },
  'click #closeEditModal, click #closeEditModal2, click .edit-modal-cancel, click #editModalBackdrop'(e, t) {
    document.getElementById('editTeamModal')?.close();
    t.isEditModalOpen.set(false);
  },
  'submit #editTeamForm'(e, t) {
    e.preventDefault();
    const newName = (e.target.teamName?.value || '').trim();
    const teamId = selectedTeamId.get();
    if (!teamId || !newName) return;
    Meteor.call('updateTeamName', teamId, newName, (err) => {
      if (err) {
        alert('Error updating team: ' + (err.reason || err.message));
        return;
      }
      document.getElementById('editTeamModal')?.close();
      t.isEditModalOpen.set(false);
    });
  },
  'click #openDeleteTeam'(e, t) {
    t.isDeleteModalOpen.set(true);
    Tracker.afterFlush(() => document.getElementById('deleteTeamModal')?.showModal());
  },
  'click #closeDeleteModal, click #closeDeleteModal2, click #deleteModalBackdrop'(e, t) {
    document.getElementById('deleteTeamModal')?.close();
    t.isDeleteModalOpen.set(false);
  },
  'click #confirmDeleteTeam'(e, t) {
    const teamId = selectedTeamId.get();
    if (!teamId) return;
    const team = Teams.findOne(teamId);
    const name = team?.name || 'this team';
    Meteor.call('deleteTeam', teamId, (err) => {
      if (err) {
        alert('Error deleting team: ' + (err.reason || err.message));
        return;
      }
      document.getElementById('deleteTeamModal')?.close();
      t.isDeleteModalOpen.set(false);
      selectedTeamId.set(null);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('timeharbor-current-team-id');
      }
    });
  },
  'click .make-admin-btn'(e, t) {
    e.preventDefault();
    const teamId = selectedTeamId.get();
    const userId = e.currentTarget.dataset.id;
    if (!teamId || !userId) return;
    Meteor.call('addTeamAdmin', teamId, userId, (err) => {
      if (err) alert('Error making admin: ' + (err.reason || err.message));
    });
  },
  'click .set-password-btn'(e, t) {
    e.preventDefault();
    const teamId = selectedTeamId.get();
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
  'click .remove-admin-btn'(e, t) {
    e.preventDefault();
    const teamId = selectedTeamId.get();
    const userId = e.currentTarget.dataset.id;
    if (!teamId || !userId) return;
    const user = t.selectedTeamUsers.get().find(u => u.id === userId);
    const userName = user?.name || user?.email || 'this user';
    if (!confirm(`Remove admin status from ${userName}? They will lose admin privileges.`)) return;
    Meteor.call('removeTeamAdmin', teamId, userId, (err) => {
      if (err) alert('Error removing admin: ' + (err.reason || err.message));
    });
  },
  'click .remove-member-btn'(e, t) {
    e.preventDefault();
    const userId = e.currentTarget.dataset.id;
    const member = t.selectedTeamUsers.get().find(u => u.id === userId);
    if (member) {
      t.memberToRemove.set(member);
      Tracker.afterFlush(() => document.getElementById('removeMemberModal')?.showModal());
    }
  },
  'click #closeRemoveMemberModal, click #closeRemoveMemberModal2, click #removeMemberModalBackdrop'(e, t) {
    document.getElementById('removeMemberModal')?.close();
    t.memberToRemove.set(null);
  },
  'click #confirmRemoveMember'(e, t) {
    const teamId = selectedTeamId.get();
    const member = t.memberToRemove.get();
    if (!teamId || !member) return;
    Meteor.call('removeTeamMember', teamId, member.id, (err) => {
      if (err) {
        alert('Error removing member: ' + (err.reason || err.message));
        return;
      }
      document.getElementById('removeMemberModal')?.close();
      t.memberToRemove.set(null);
    });
  },
  'click .member-name-link'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const userId = e.currentTarget.getAttribute('data-user-id');
    const teamId = selectedTeamId.get();
    if (userId && teamId) FlowRouter.go(`/member/${teamId}/${userId}`);
  },
});
