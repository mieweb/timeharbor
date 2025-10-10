import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Teams } from '../../collections.js';
import { Accounts } from 'meteor/accounts-base';
import YAML from 'js-yaml';

const DEFAULT_PASSWORD = 'TempPass123!';

function generateTeamCode() {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

async function createUserFromYCard(userData, creatorId) {
  check(userData, {
    username: String,
    email: String,
    firstName: String,
    lastName: String,
    title: String,
    department: Match.Optional(String),
    phone: Match.Optional(Array),
    address: Match.Optional(Object),
    uid: Match.Optional(String)
  });
  
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
  
  const userId = await Accounts.createUserAsync({
    username: userData.username,
    email: userData.email,
    password: DEFAULT_PASSWORD,
    profile: {
      firstName: userData.firstName,
      lastName: userData.lastName,
      title: userData.title,
      department: userData.department || 'General',
      phone: userData.phone || [],
      address: userData.address || {},
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
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }

    if (teamId) {
      check(teamId, String);
      
      const team = await Teams.findOneAsync({ 
        _id: teamId, 
        members: this.userId 
      });
      
      if (!team) {
        throw new Meteor.Error('not-authorized', 'Not a member of this team');
      }
      
      const users = await Meteor.users.find({ 
        _id: { $in: team.members } 
      }, {
        fields: {
          username: 1,
          emails: 1,
          'profile.firstName': 1,
          'profile.lastName': 1,
          'profile.surname': 1,
          'profile.email': 1,
          'profile.title': 1,
          'profile.department': 1,
          'profile.manager': 1,
          'profile.organization': 1,
          'profile.phone': 1,
          'profile.address': 1,
          'profile.vCardData': 1
        }
      }).fetchAsync();
      
      return users.map(user => ({
        id: user._id,
        username: user.username,
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || user.profile?.surname || '',
        email: user.profile?.email || user.emails?.[0]?.address || '',
        title: user.profile?.title || 'Team Member',
        department: user.profile?.department || 'General',
        manager: user.profile?.manager || null,
        organization: user.profile?.organization || 'TimeHarbor',
        phone: user.profile?.phone || [],
        address: user.profile?.address || {},
        vCardData: user.profile?.vCardData || null,
        isTeamLeader: team.leader === user._id,
        isTeamAdmin: team.admins?.includes(user._id) || false
      }));
    }
    
    check(userIds, [String]);
    const users = await Meteor.users.find({ _id: { $in: userIds } }).fetchAsync();
    return users.map(user => ({ 
      id: user._id, 
      username: user.username,
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || user.profile?.surname || '',
      email: user.profile?.email || user.emails?.[0]?.address || '',
      phone: user.profile?.phone || [],
      address: user.profile?.address || {},
      vCardData: user.profile?.vCardData || null
    }));
  },

  searchUsersByName(searchTerm) {
    check(searchTerm, String);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }
    
    const regex = new RegExp(searchTerm, 'i');
    
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
        emails: 1,
        'profile.email': 1,
        'profile.firstName': 1,
        'profile.lastName': 1,
        'profile.title': 1,
        'profile.department': 1,
        'profile.manager': 1,
        'profile.phone': 1,           // ADD THIS
        'profile.address': 1,         // ADD THIS
        'profile.organization': 1
      }
    }).fetch();
    
    return users;
  },
  
  async saveYCardData(teamId, ycardContent, vCards) {
    check(teamId, String);
    check(ycardContent, String);
    check(vCards, Array);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }
    
    const team = await Teams.findOneAsync({ _id: teamId, members: this.userId });
    if (!team) {
      throw new Meteor.Error('not-authorized', 'Not a member of this team');
    }
    
    try {
      const yamlData = YAML.load(ycardContent);
      console.log('Parsed YAML data:', yamlData);
      
      const processedUsers = [];
      const errors = [];
      const teamMemberIds = new Set(team.members || []);

      // Process each person and their corresponding vCard
      for (let i = 0; i < yamlData.people.length; i++) {
        const person = yamlData.people[i];
        const vCard = vCards[i]; // Get corresponding vCard
        
        try {
          if (!person.name || !person.email) {
            console.log("Skipping person - missing required fields:", person);
            errors.push(`Person missing required name or email: ${JSON.stringify(person)}`);
            continue;
          }
          
          let userId = null;
          let username = null;
          
          // If uid is provided and looks like a MongoDB ObjectId, try to find existing user by ID
          if (person.uid && person.uid.length === 17) {
            const existingUserById = await Meteor.users.findOneAsync({ _id: person.uid });
            if (existingUserById) {
              userId = existingUserById._id;
              username = existingUserById.username;
              console.log("Found existing user by uid:", username);
            }
          }
          
          // If not found by uid, generate username and search by email/username
          if (!userId) {
          // Ignore placeholder uid values like "new-user"
          const useableUid = (person.uid && person.uid !== 'new-user') ? person.uid : null;
          username = useableUid || `${person.name}-${person.surname || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          console.log("Processing person:", username);
         }
          
          const existingUser = await Meteor.users.findOneAsync({
            $or: [
              { 'emails.address': person.email },
              { 'profile.email': person.email },
              { username: username }
            ]
          });
          
          let finalUserId;
          
          // Prepare update data
          const updateData = {
            'profile.firstName': person.name || username,
            'profile.surname': person.surname || '',
            'profile.title': person.title || 'Team Member',
            'profile.manager': person.manager || null,
            'profile.email': person.email,
            'profile.organization': person.org || 'TimeHarbor',
            'profile.department': person.org_unit || 'General',
            'profile.phone': person.phone || [],
            'profile.address': person.address || {},
            'profile.vCardData': vCard,
            'profile.updatedAt': new Date(),
            'profile.updatedBy': this.userId
          };
          
          if (existingUser || userId) {
            // Update existing user with full data including phone and address
            const userIdToUpdate = userId || existingUser._id;
            await Meteor.users.updateAsync(userIdToUpdate, {
              $set: updateData
            });
            
            finalUserId = userIdToUpdate;
            processedUsers.push({
              userId: finalUserId,
              username: username,
              action: 'updated',
              name: `${person.name || username} ${person.surname || ''}`.trim(),
              vCardStored: true
            });
            
          } else {
            // Create new user
            try {
              finalUserId = await createUserFromYCard({
                uid: person.uid || null,
                username: username,
                email: person.email,
                firstName: person.name || username,
                lastName: person.surname || '',
                title: person.title || 'Team Member',
                department: person.org_unit || 'General',
                phone: person.phone || [],
                address: person.address || {}
              }, this.userId);
              
              // Add vCard data to newly created user
              await Meteor.users.updateAsync(finalUserId, {
                $set: {
                  'profile.vCardData': vCard,
                  'profile.organization': person.org || 'TimeHarbor',
                  'profile.manager': person.manager || null
                }
              });
              
              processedUsers.push({
                userId: finalUserId,
                username: username,
                action: 'created',
                name: `${person.name || username} ${person.surname || ''}`.trim(),
                vCardStored: true
              });
              
            } catch (createError) {
              if (createError.error === 'user-exists') {
                const retryUser = await Meteor.users.findOneAsync({
                  $or: [
                    { username: username },
                    { 'emails.address': person.email }
                  ]
                });
                
                if (retryUser) {
                  // Add full data including vCard to found user
                  await Meteor.users.updateAsync(retryUser._id, {
                    $set: updateData
                  });
                  
                  finalUserId = retryUser._id;
                  processedUsers.push({
                    userId: finalUserId,
                    username: username,
                    action: 'found_existing',
                    name: `${person.name || username} ${person.surname || ''}`.trim(),
                    vCardStored: true
                  });
                } else {
                  throw createError;
                }
              } else {
                throw createError;
              }
            }
          }
          
          // Add user to team if not already a member
          if (finalUserId && !teamMemberIds.has(finalUserId)) {
            teamMemberIds.add(finalUserId);
          }
          
        } catch (personError) {
          console.error(`Error processing person ${person.name || 'unknown'}:`, personError);
          errors.push(`Error processing ${person.name || 'unknown'}: ${personError.message}`);
        }
      }
      
      // Update team with member IDs only
      const updatedMemberIds = Array.from(teamMemberIds);
      
      await Teams.updateAsync(teamId, {
        $set: {
          members: updatedMemberIds
        }
      });
      
      return {
        success: true,
        totalProcessed: processedUsers.length,
        totalAttempted: yamlData.people.length,
        totalTeamMembers: updatedMemberIds.length,
        vCardsStored: processedUsers.filter(u => u.vCardStored).length,
        errors: errors,
        processedUsers: processedUsers,
        message: errors.length > 0 
          ? `Processed ${processedUsers.length}/${yamlData.people.length} users with vCard data. ${errors.length} errors occurred.`
          : `Successfully processed all ${processedUsers.length} users with vCard data.`
      };
      
    } catch (yamlError) {
      console.error('YAML parsing error:', yamlError);
      throw new Meteor.Error('yaml-parse-error', `Failed to parse YAML: ${yamlError.message}`);
    }
  },

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
  
  async createUserFromYCard(userData) {
    check(userData, {
      username: String,
      email: String,
      firstName: String,
      lastName: String,
      title: String,
      department: String,
      phone: Match.Optional(Array),
      address: Match.Optional(Object)
    });
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }
    
    return await createUserFromYCard(userData, this.userId);
  },

  async addCollaboratorToTeam(teamId, userData) {
  check(teamId, String);
  check(userData, {
    firstName: String,
    lastName: String,
    title: String,
    organization: String,
    email: String,
    phone: Array,
    address: Object
  });
  
  if (!this.userId) {
    throw new Meteor.Error('not-authorized', 'Must be logged in');
  }
  
  // Verify user is a member/admin of the team
  const team = await Teams.findOneAsync({ 
    _id: teamId, 
    members: this.userId 
  });
  
  if (!team) {
    throw new Meteor.Error('not-authorized', 'Not a member of this team');
  }
  
  // Check if user already exists by email
  const existingUser = await Meteor.users.findOneAsync({
    $or: [
      { 'emails.address': userData.email },
      { 'profile.email': userData.email }
    ]
  });
  
  let userId;
  
  if (existingUser) {
    // User exists, just add to team if not already a member
    userId = existingUser._id;
    
    if (!team.members.includes(userId)) {
      await Teams.updateAsync(teamId, {
        $addToSet: { members: userId }
      });
    }
    
    // Update user profile with new data
    await Meteor.users.updateAsync(userId, {
      $set: {
        'profile.firstName': userData.firstName,
        'profile.lastName': userData.lastName,
        'profile.title': userData.title,
        'profile.organization': userData.organization,
        'profile.email': userData.email,
        'profile.phone': userData.phone,
        'profile.address': userData.address,
        'profile.updatedAt': new Date(),
        'profile.updatedBy': this.userId
      }
    });
    
    return {
      success: true,
      userId: userId,
      action: 'updated',
      message: 'Existing user updated and added to team'
    };
    
  } else {
    // Create new user
    const username = `${userData.firstName.toLowerCase()}.${userData.lastName.toLowerCase()}`.replace(/\s+/g, '');
    const password = 'TempPass123!'; // Default password
    
    try {
      userId = await Accounts.createUserAsync({
        username: username,
        email: userData.email,
        password: password,
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          title: userData.title,
          organization: userData.organization,
          email: userData.email,
          phone: userData.phone,
          address: userData.address,
          createdBy: this.userId,
          createdAt: new Date()
        }
      });
      
      // Add new user to team
      await Teams.updateAsync(teamId, {
        $addToSet: { members: userId }
      });
      
      return {
        success: true,
        userId: userId,
        action: 'created',
        message: 'New user created and added to team',
        defaultPassword: password
      };
      
    } catch (createError) {
      console.error('Error creating user:', createError);
      throw new Meteor.Error('create-failed', 'Failed to create new user: ' + createError.message);
    }
  }
}



};

