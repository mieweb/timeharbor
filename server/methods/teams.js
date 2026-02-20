import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import 'meteor/accounts-password';
import { check } from 'meteor/check';
import { Teams, Notifications } from '../../collections.js';
import { getUserDisplayName, getUserDisplayEmail } from '../utils/userHelpers.js';
import { notifyUser } from '../utils/pushNotifications.js';

function generateTeamCode() {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

export const teamMethods = {
  async joinTeamWithCode(teamCode) {
    check(teamCode, String);
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    const team = await Teams.findOneAsync({ code: teamCode });
    if (!team) {
      throw new Meteor.Error('not-found', 'Team not found');
    }
    if (team.members.includes(this.userId)) {
      throw new Meteor.Error('already-member', 'You are already a member of this team');
    }
    await Teams.updateAsync(team._id, { $push: { members: this.userId } });
    return team._id;
  },

  async createTeam(teamName) {
    check(teamName, String);
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    const code = generateTeamCode();
    const teamId = await Teams.insertAsync({
      name: teamName,
      members: [this.userId],
      admins: [this.userId], // Creator is admin
      code,
      createdAt: new Date(),
    });
    return { teamId, code };
  },

  async getUsers(userIds) {
    check(userIds, [String]);
    const users = await Meteor.users.find({ _id: { $in: userIds } }).fetchAsync();
    return users.map(user => ({ 
      id: user._id, 
      name: getUserDisplayName(user, 'Unknown'), 
      email: getUserDisplayEmail(user) 
    }));
  },
  async updateTeamName(teamId, newName) {
    check(teamId, String);
    check(newName, String);
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    const team = await Teams.findOneAsync(teamId);
    if (!team) {
      throw new Meteor.Error('not-found', 'Team not found');
    }
    const isAdmin = Array.isArray(team.admins) && team.admins.includes(this.userId);
    if (!isAdmin) {
      throw new Meteor.Error('forbidden', 'Only admins can rename team');
    }
    const trimmed = newName.trim();
    if (!trimmed) {
      throw new Meteor.Error('bad-request', 'Team name cannot be empty');
    }
    await Teams.updateAsync(teamId, { $set: { name: trimmed } });
  },
  async deleteTeam(teamId) {
    check(teamId, String);
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    const team = await Teams.findOneAsync(teamId);
    if (!team) {
      throw new Meteor.Error('not-found', 'Team not found');
    }
    const isAdmin = Array.isArray(team.admins) && team.admins.includes(this.userId);
    if (!isAdmin) {
      throw new Meteor.Error('forbidden', 'Only admins can delete team');
    }
    await Teams.removeAsync(teamId);
  },

  // Promote a team member to admin/co-admin
  async addTeamAdmin(teamId, userId) {
    check(teamId, String);
    check(userId, String);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    const team = await Teams.findOneAsync(teamId);
    if (!team) {
      throw new Meteor.Error('not-found', 'Team not found');
    }

    const isRequesterAdmin =
      Array.isArray(team.admins) && team.admins.includes(this.userId);
    if (!isRequesterAdmin) {
      throw new Meteor.Error('forbidden', 'Only admins can promote members');
    }

    if (!Array.isArray(team.members) || !team.members.includes(userId)) {
      throw new Meteor.Error('bad-request', 'User is not a member of this team');
    }

    // Add the user as admin/co-admin (no duplicates)
    await Teams.updateAsync(teamId, { $addToSet: { admins: userId } });
  },

  // Remove admin/co-admin status from a team member
  async removeTeamAdmin(teamId, userId) {
    check(teamId, String);
    check(userId, String);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    const team = await Teams.findOneAsync(teamId);
    if (!team) {
      throw new Meteor.Error('not-found', 'Team not found');
    }

    const isRequesterAdmin =
      Array.isArray(team.admins) && team.admins.includes(this.userId);
    if (!isRequesterAdmin) {
      throw new Meteor.Error('forbidden', 'Only admins can remove admin status');
    }

    const admins = Array.isArray(team.admins) ? team.admins : [];

    // Ensure at least one admin remains
    const remainingAdmins = admins.filter((id) => id !== userId);
    if (remainingAdmins.length === 0) {
      throw new Meteor.Error('bad-request', 'Team must have at least one admin');
    }

    // Remove user from admins array
    await Teams.updateAsync(teamId, { $set: { admins: remainingAdmins } });
  },

  // Admin-only: remove a member from the team (cannot remove self; must leave at least one admin)
  async removeTeamMember(teamId, userId) {
    check(teamId, String);
    check(userId, String);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    const team = await Teams.findOneAsync(teamId);
    if (!team) {
      throw new Meteor.Error('not-found', 'Team not found');
    }

    const isRequesterAdmin =
      Array.isArray(team.admins) && team.admins.includes(this.userId);
    if (!isRequesterAdmin) {
      throw new Meteor.Error('forbidden', 'Only admins can remove members');
    }

    if (userId === this.userId) {
      throw new Meteor.Error('bad-request', 'You cannot remove yourself; use Leave Team or delete the team');
    }

    if (!Array.isArray(team.members) || !team.members.includes(userId)) {
      throw new Meteor.Error('bad-request', 'User is not a member of this team');
    }

    const admins = Array.isArray(team.admins) ? team.admins : [];
    const remainingAdmins = admins.filter((id) => id !== userId);
    if (remainingAdmins.length === 0) {
      throw new Meteor.Error('bad-request', 'Team must have at least one admin. Promote another member to admin first.');
    }

    await Teams.updateAsync(teamId, {
      $pull: { members: userId, admins: userId },
    });
  },

  // Invite a user to join the team by email — sends in-app + push notification
  async inviteTeamMember(teamId, email) {
    check(teamId, String);
    check(email, String);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    const team = await Teams.findOneAsync(teamId);
    if (!team) {
      throw new Meteor.Error('not-found', 'Team not found');
    }

    // Only team members can invite
    if (!Array.isArray(team.members) || !team.members.includes(this.userId)) {
      throw new Meteor.Error('forbidden', 'You must be a member of this team to invite others');
    }

    // Find the invited user by email
    const invitedUser = await Meteor.users.findOneAsync({
      $or: [
        { 'emails.address': { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { 'services.google.email': { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      ]
    });

    if (!invitedUser) {
      throw new Meteor.Error('not-found', 'No user found with that email. They need to sign up first.');
    }

    if (team.members.includes(invitedUser._id)) {
      throw new Meteor.Error('already-member', 'This user is already a member of the team.');
    }

    // Get inviter name
    const inviter = await Meteor.users.findOneAsync(this.userId);
    const inviterName = getUserDisplayName(inviter, 'Someone');

    const title = 'Team Invite';
    const body = `${inviterName} invited you to join their team "${team.name}" using this code "${team.code}"`;

    // Create in-app notification
    await Notifications.insertAsync({
      userId: invitedUser._id,
      title,
      body,
      data: {
        type: 'team-invite',
        teamId: team._id,
        teamCode: team.code,
        inviterId: this.userId,
      },
      read: false,
      createdAt: new Date(),
    });

    // Send push notification
    try {
      await notifyUser(invitedUser._id, { title, body });
    } catch (err) {
      console.error('Failed to send invite push notification:', err);
    }

    return `Invite sent to ${email}!`;
  },

  // Admin-only: set a password for a team member
  async setTeamMemberPassword({ teamId, userId, newPassword }) {
    check(teamId, String);
    check(userId, String);
    check(newPassword, String);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }

    const team = await Teams.findOneAsync(teamId);
    if (!team) {
      throw new Meteor.Error('not-found', 'Team not found');
    }

    const isRequesterAdmin =
      Array.isArray(team.admins) && team.admins.includes(this.userId);
    if (!isRequesterAdmin) {
      throw new Meteor.Error('forbidden', 'Only admins can set passwords');
    }

    const isMember =
      (Array.isArray(team.members) && team.members.includes(userId)) ||
      (Array.isArray(team.admins) && team.admins.includes(userId));
    if (!isMember) {
      throw new Meteor.Error('bad-request', 'User is not a member of this team');
    }

    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 6) {
      throw new Meteor.Error('bad-request', 'Password must be at least 6 characters');
    }

    const user = await Meteor.users.findOneAsync(userId);
    if (!user) {
      throw new Meteor.Error('not-found', 'User not found');
    }

    const existingEmail = user?.emails?.[0]?.address;
    const emailToSet = existingEmail || user?.username || null;

    if (!emailToSet) {
      throw new Meteor.Error('bad-request', 'User does not have an email to set a password');
    }

    if (!existingEmail) {
      await Meteor.users.updateAsync(userId, {
        $set: { emails: [{ address: emailToSet, verified: true }] },
      });
    }

    if (typeof Accounts.setPassword === 'function') {
      Accounts.setPassword(userId, trimmedPassword, { logout: false });
      return true;
    }

    if (typeof Accounts.setPasswordAsync === 'function') {
      await Accounts.setPasswordAsync(userId, trimmedPassword, { logout: false });
      return true;
    }

    throw new Meteor.Error('not-available', 'Password functionality is not available on the server');
  },
};