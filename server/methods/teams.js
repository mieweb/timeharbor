import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Teams } from '../../collections.js';

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
      admins: [this.userId],
      leader: this.userId,
      code,
      createdAt: new Date(),
    });
    return teamId;
  },

  async getUsers(userIds) {
    check(userIds, [String]);
    const users = await Meteor.users.find({ _id: { $in: userIds } }).fetchAsync();
    const toName = (user) => {
      return (
        user?.profile?.name ||
        user?.services?.google?.name ||
        user?.services?.github?.username ||
        user?.username ||
        (user?.emails?.[0]?.address || user?.services?.google?.email || '').split('@')[0] ||
        'Unknown'
      );
    };
    const toEmail = (user) => (
      user?.emails?.[0]?.address || user?.services?.google?.email || 'No email'
    );
    return users.map(user => ({ id: user._id, name: toName(user), email: toEmail(user) }));
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
}; 