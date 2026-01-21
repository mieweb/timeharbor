import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import 'meteor/accounts-password';
import { Teams } from '../../collections.js';

export const authMethods = {
  createUserAccount({ email, password }) {
    if (!email || !password) {
      throw new Meteor.Error('invalid-data', 'Email and password are required');
    }
    
    try {
      const userId = Accounts.createUser({ email, password });
      console.log('User created:', { userId, email }); // Log user creation details
      return userId;
    } catch (error) {
      console.error('Error in createUserAccount method:', error);
      throw new Meteor.Error('server-error', 'Failed to create user');
    }
  },
  async resetPasswordWithTeamCode({ email, teamCode, newPassword }) {
    if (!email || !teamCode || !newPassword) {
      throw new Meteor.Error('invalid-data', 'Email, team code, and password are required');
    }

    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 6) {
      throw new Meteor.Error('invalid-data', 'Password must be at least 6 characters');
    }

    const user = await Accounts.findUserByEmail(email.trim());
    if (!user) {
      throw new Meteor.Error('not-found', 'User not found');
    }

    const team = await Teams.findOneAsync({ code: teamCode.trim() });
    if (!team) {
      throw new Meteor.Error('invalid-code', 'Invalid team code');
    }

    const isMember =
      (team.members || []).includes(user._id) ||
      (team.admins || []).includes(user._id);
    if (!isMember) {
      throw new Meteor.Error('forbidden', 'User is not in this team');
    }

    if (typeof Accounts.setPassword === 'function') {
      Accounts.setPassword(user._id, trimmedPassword, { logout: false });
      return true;
    }

    if (typeof Accounts.setPasswordAsync === 'function') {
      await Accounts.setPasswordAsync(user._id, trimmedPassword, { logout: false });
      return true;
    }

    throw new Meteor.Error('not-available', 'Password reset not available');
  },
}; 