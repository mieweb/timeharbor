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
    return users.map(user => ({ id: user._id, username: user.username }));
  },

  searchUsersByName(searchTerm) {
    check(searchTerm, String);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }
    
    // Search for users with matching usernames
    const regex = new RegExp(searchTerm, 'i'); // Case insensitive
    
    const users = Meteor.users.find({
      $or: [
        { username: regex },
        { 'profile.firstName': regex },
        { 'profile.lastName': regex },
        { 'profile.email': regex }
      ]
    }, {
      limit: 10,
      fields: {
        username: 1,
        'profile.email': 1,
        'profile.firstName': 1,
        'profile.lastName': 1,
        'profile.title': 1,
        'profile.department': 1,
        'profile.manager': 1
      }
    }).fetch();
    
    return users;
  },
  
  // Save yCard data for a team
  saveYCardData(teamId, ycardContent) {
    check(teamId, String);
    check(ycardContent, String);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }
    
    // Verify user is a member of the team
    const team = Teams.findOne({ _id: teamId, members: this.userId });
    if (!team) {
      throw new Meteor.Error('not-authorized', 'Not a member of this team');
    }
    
    // Save the yCard data to the team document
    Teams.update(teamId, {
      $set: {
        ycardData: ycardContent,
        ycardUpdatedAt: new Date(),
        ycardUpdatedBy: this.userId
      }
    });
    
    return true;
  },
  
  // Get yCard data for a team
  getYCardData(teamId) {
    check(teamId, String);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }
    
    const team = Teams.findOne({ _id: teamId, members: this.userId }, {
      fields: { ycardData: 1 }
    });
    
    return team?.ycardData || '';
  },
  
  // Create a new user from yCard data
  createUserFromYCard(userData) {
    check(userData, {
      username: String,
      email: String,
      firstName: String,
      lastName: String,
      title: String,
      department: String
    });
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }
    
    // Check if user already exists
    const existingUser = Meteor.users.findOne({
      $or: [
        { username: userData.username },
        { 'profile.email': userData.email }
      ]
    });
    
    if (existingUser) {
      throw new Meteor.Error('user-exists', 'User already exists');
    }
    
    // Create new user
    const userId = Accounts.createUser({
      username: userData.username,
      email: userData.email,
      profile: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        title: userData.title,
        department: userData.department,
        createdBy: this.userId,
        createdAt: new Date()
      }
    });
    
    return userId;
  }





}; 