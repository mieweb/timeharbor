import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import 'meteor/accounts-password';
import { Teams } from '../../collections.js';

export const authMethods = {
  createUserAccount({ email, password, firstName, lastName }) {
    if (!email || !password) {
      throw new Meteor.Error('invalid-data', 'Email and password are required');
    }
    if (!firstName || !lastName) {
      throw new Meteor.Error('invalid-data', 'First name and last name are required');
    }
    
    try {
      const userId = Accounts.createUser({ 
        email, 
        password,
        profile: {
          firstName: firstName.trim(),
          lastName: lastName.trim()
        }
      });
      console.log('User created:', { userId, email, firstName, lastName }); // Log user creation details
      return userId;
    } catch (error) {
      console.error('Error in createUserAccount method:', error);
      throw new Meteor.Error('server-error', 'Failed to create user');
    }
  },
  async updateUserProfile({ firstName, lastName }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in to update your profile');
    }
    
    if (!firstName || !lastName) {
      throw new Meteor.Error('invalid-data', 'First name and last name are required');
    }
    
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    
    if (!trimmedFirstName || !trimmedLastName) {
      throw new Meteor.Error('invalid-data', 'First name and last name cannot be empty');
    }
    
    try {
      await Meteor.users.updateAsync(this.userId, {
        $set: {
          'profile.firstName': trimmedFirstName,
          'profile.lastName': trimmedLastName
        }
      });
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Meteor.Error('server-error', 'Failed to update profile');
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