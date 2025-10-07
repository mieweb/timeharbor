import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';

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

  async updateUserProfile(updates) {
    check(updates, Object);
    if (!this.userId) throw new Meteor.Error('not-authorized');

    try {
      await Meteor.users.updateAsync(this.userId, { $set: updates });
      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Meteor.Error('server-error', 'Failed to update profile');
    }
  }
}; 