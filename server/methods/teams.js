import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Teams } from '../../collections.js';
import { Accounts } from 'meteor/accounts-base';
import YAML from 'js-yaml';

// Global default password for new users
const DEFAULT_PASSWORD = 'TempPass123!';

function generateTeamCode() {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// Helper function to create user from yCard data
async function createUserFromYCard(userData, creatorId) {
  check(userData, {
    username: String,
    email: String,
    firstName: String,
    lastName: String,
    title: String,
    department: String
  });
  
  // Check if user already exists
  const existingUser = await Meteor.users.findOneAsync({
    $or: [
      { username: userData.username },
      { 'profile.email': userData.email },
      { 'emails.address': userData.email }
    ]
  });
  
  if (existingUser) {
    throw new Meteor.Error('user-exists', 'User already exists');
  }
  
  // Create new user
  const userId = await Accounts.createUserAsync({
    username: userData.username,
    email: userData.email,
    password: DEFAULT_PASSWORD,
    profile: {
      firstName: userData.firstName,
      lastName: userData.lastName,
      title: userData.title,
      department: userData.department,
      createdBy: creatorId,
      createdAt: new Date()
    }
  });
  
  return userId;
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

  async getUsers(userIds, teamId = null) {
    check(userIds, [String]);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }

    // If teamId is provided, get users from that specific team
    if (teamId) {
      check(teamId, String);
      
      // Check if user is a member of the team
      const team = await Teams.findOneAsync({ 
        _id: teamId, 
        members: this.userId 
      });
      
      if (!team) {
        throw new Meteor.Error('not-authorized', 'Not a member of this team');
      }
      
      // Get all team members
      const users = await Meteor.users.find({ 
        _id: { $in: team.members } 
      }, {
        fields: {
          username: 1,
          'profile.firstName': 1,
          'profile.lastName': 1,
          'profile.surname': 1,
          'profile.email': 1,
          'profile.title': 1,
          'profile.department': 1,
          'profile.manager': 1,
          'profile.organization': 1
        }
      }).fetchAsync();
      
      return users.map(user => ({
        id: user._id,
        username: user.username,
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || user.profile?.surname || '',
        email: user.profile?.email || '',
        title: user.profile?.title || 'Team Member',
        department: user.profile?.department || 'General',
        manager: user.profile?.manager || null,
        organization: user.profile?.organization || 'TimeHarbor',
        isTeamLeader: team.leader === user._id,
        isTeamAdmin: team.admins?.includes(user._id) || false
      }));
    }
    
    // Original functionality - get specific users by IDs
    const users = await Meteor.users.find({ _id: { $in: userIds } }).fetchAsync();
    return users.map(user => ({ 
      id: user._id, 
      username: user.username,
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || user.profile?.surname || '',
      email: user.profile?.email || ''
    }));
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
  
  async saveYCardData(teamId, ycardContent) {
    check(teamId, String);
    check(ycardContent, String);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }
    
    // Check if user is a member of the team
    const team = await Teams.findOneAsync({ _id: teamId, members: this.userId });
    if (!team) {
      throw new Meteor.Error('not-authorized', 'Not a member of this team');
    }
    
    try {
      // Parse the YAML content
      const yamlData = YAML.load(ycardContent);
      console.log('Parsed YAML data:', yamlData);
      
      const processedUsers = [];
      const errors = [];
      const teamMemberIds = new Set(team.members || []);

      // Iterate over each person in the YAML
      for (const person of yamlData.people) {
        try {
          // Validate required fields
          if (!person.username || !person.email) {
            console.log("Skipping person - missing required fields:", person);
            errors.push(`Person missing required username or email: ${JSON.stringify(person)}`);
            continue;
          }
          
          console.log("Processing person:", person.username);
          
          // Check if user already exists
          const existingUser = await Meteor.users.findOneAsync({
            $or: [
              { 'emails.address': person.email },
              { 'profile.email': person.email },
              { username: person.username }
            ]
          });
          
          let userId;
        
          if (existingUser) {
            // Update existing user's profile
            await Meteor.users.updateAsync(existingUser._id, {
              $set: {
                'profile.firstName': person.name || person.username,
                'profile.surname': person.surname || '',
                'profile.title': person.title || 'Team Member',
                'profile.manager': person.manager || null,
                'profile.email': person.email,
                'profile.organization': person.org || 'TimeHarbor',
                'profile.department': person.org_unit || 'General',
                'profile.updatedAt': new Date(),
                'profile.updatedBy': this.userId
              }
            });
            
            userId = existingUser._id;
            processedUsers.push({
              userId: userId,
              username: person.username,
              action: 'updated',
              name: `${person.name || person.username} ${person.surname || ''}`.trim()
            });
            
          } else {
            // Create new user using the helper function
            try {
              userId = await createUserFromYCard({
                username: person.username,
                email: person.email,
                firstName: person.name || person.username,
                lastName: person.surname || '',
                title: person.title || 'Team Member',
                department: person.org_unit || 'General'
              }, this.userId);
              
              processedUsers.push({
                userId: userId,
                username: person.username,
                action: 'created',
                name: `${person.name || person.username} ${person.surname || ''}`.trim()
              });
              
            } catch (createError) {
              if (createError.error === 'user-exists') {
                // Handle race condition - user might have been created between our check and creation
                const retryUser = await Meteor.users.findOneAsync({
                  $or: [
                    { username: person.username },
                    { 'emails.address': person.email }
                  ]
                });
                
                if (retryUser) {
                  userId = retryUser._id;
                  processedUsers.push({
                    userId: userId,
                    username: person.username,
                    action: 'found_existing',
                    name: `${person.name || person.username} ${person.surname || ''}`.trim()
                  });
                } else {
                  throw createError;
                }
              } else {
                throw createError;
              }
            }
          }
          
          // Add user to team members if not already a member
          if (userId && !teamMemberIds.has(userId)) {
            teamMemberIds.add(userId);
          }
          
        } catch (personError) {
          console.error(`Error processing person ${person.username || 'unknown'}:`, personError);
          errors.push(`Error processing ${person.username || 'unknown'}: ${personError.message}`);
        }
      }
      
      // Update team with new member list
      const updatedMemberIds = Array.from(teamMemberIds);
      
      await Teams.updateAsync(teamId, {
        $set: {
          members: updatedMemberIds
        }
      });
      
      // Return detailed results
      return {
        success: true,
        totalProcessed: processedUsers.length,
        totalAttempted: yamlData.people.length,
        totalTeamMembers: updatedMemberIds.length,
        errors: errors,
        processedUsers: processedUsers,
        message: errors.length > 0 
          ? `Processed ${processedUsers.length}/${yamlData.people.length} users. ${errors.length} errors occurred.`
          : `Successfully processed all ${processedUsers.length} users.`
      };
      
    } catch (yamlError) {
      console.error('YAML parsing error:', yamlError);
      throw new Meteor.Error('yaml-parse-error', `Failed to parse YAML: ${yamlError.message}`);
    }
  },

  // Get yCard data for a team
  async getYCardData(teamId) {
    check(teamId, String);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }
    
    const team = await Teams.findOneAsync({ _id: teamId, members: this.userId }, {
      fields: { ycardData: 1 }
    });
    
    return team?.ycardData || '';
  },
  
  // Create a new user from yCard data (wrapper for the helper function)
  async createUserFromYCard(userData) {
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
    
    return await createUserFromYCard(userData, this.userId);
  }
};