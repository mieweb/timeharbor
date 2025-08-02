import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

export const authMethods = {
  createUserAccount({ username, password }) {
    if (!username || !password) {
      throw new Meteor.Error('invalid-data', 'Username and password are required');
    }
    
    try {
      const userId = Accounts.createUser({ username, password });
      console.log('User created:', { userId, username }); // Log user creation details
      return userId;
    } catch (error) {
      console.error('Error in createUserAccount method:', error);
      throw new Meteor.Error('server-error', 'Failed to create user');
    }
  },
}; 