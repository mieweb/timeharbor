import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Teams } from '../../collections.js';
import yaml from 'js-yaml';

function generateTeamCode() {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// Helper function to normalize person data
function normalizePerson(person) {
  if (!person) return null;
  
  return {
    // Core identifiers
    uid: person.uid || person.id,
    
    // Name fields with aliases
    name: person.name || person.nombre || person.displayName,
    surname: person.surname || person.apellido || person.sn || person.lastName,
    
    // Title/position with aliases
    title: person.title || person.puesto || person.role,
    
    // Contact information with aliases
    email: person.email || person.correo || person.mail,
    
    // Organization with aliases
    org: person.org || person.organization || person.company,
    org_unit: person.org_unit || person.department || person.ou,
    
    // Management with aliases
    manager: person.manager || person.jefe || person['上司'] || person.boss,
    
    // Contact details
    phone: person.phone || person.tel,
    address: person.address || person.adr,
    
    // Multi-hat support
    jobs: person.jobs,
    
    // Internationalization
    i18n: person.i18n,
    
    // Keep original data for reference
    _original: person
  };
}

// Helper function to parse yCard YAML
function parseYCard(yamlText) {
  try {
    if (!yamlText || yamlText.trim() === '') {
      return { people: [], errors: [] };
    }
    
    const data = yaml.load(yamlText);
    if (!data) {
      return { people: [], errors: ['Empty or invalid YAML'] };
    }
    
    let people = [];
    const errors = [];
    
    // Handle people array format
    if (Array.isArray(data.people)) {
      people = data.people.map((person, idx) => {
        const normalized = normalizePerson(person);
        if (!normalized.uid) {
          errors.push(`Person ${idx + 1}: Missing uid`);
        }
        if (!normalized.name) {
          errors.push(`Person ${idx + 1}: Missing name (or alias)`);
        }
        return normalized;
      }).filter(Boolean);
    }
    // Handle single person object
    else if (typeof data === 'object' && (data.uid || data.name || data.surname)) {
      const normalized = normalizePerson(data);
      if (!normalized.uid) {
        errors.push('Missing uid');
      }
      if (!normalized.name) {
        errors.push('Missing name (or alias)');
      }
      people = [normalized];
    }
    
    return { people, errors };
  } catch (error) {
    return { people: [], errors: [error.message || 'YAML parsing error'] };
  }
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
      contacts: [], // Initialize empty contacts array for yCard data
      yCardData: '', // Store raw yCard YAML
      createdAt: new Date(),
    });
    return teamId;
  },

  async getUsers(userIds) {
    check(userIds, [String]);
    const users = await Meteor.users.find({ _id: { $in: userIds } }).fetchAsync();
    return users.map(user => ({ id: user._id, username: user.username }));
  },

  async updateTeamContacts(teamId, yCardYaml) {
    check(teamId, String);
    check(yCardYaml, String);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    
    // Check if user is admin of the team
    const team = await Teams.findOneAsync({ 
      _id: teamId, 
      $or: [{ admins: this.userId }, { leader: this.userId }] 
    });
    
    if (!team) {
      throw new Meteor.Error('not-authorized', 'You are not authorized to edit this team');
    }
    
    // Parse and validate yCard data
    const { people, errors } = parseYCard(yCardYaml);
    
    if (errors.length > 0) {
      throw new Meteor.Error('invalid-ycard', 'yCard validation failed: ' + errors.join(', '));
    }
    
    // Update team with new contacts data
    await Teams.updateAsync(teamId, {
      $set: {
        contacts: people,
        yCardData: yCardYaml,
        contactsUpdatedAt: new Date(),
        contactsUpdatedBy: this.userId
      }
    });
    
    return { people, errors: [] };
  },

  async getTeamContacts(teamId) {
    check(teamId, String);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    
    // Check if user is member of the team
    const team = await Teams.findOneAsync({ 
      _id: teamId, 
      members: this.userId 
    });
    
    if (!team) {
      throw new Meteor.Error('not-authorized', 'You are not a member of this team');
    }
    
    return {
      contacts: team.contacts || [],
      yCardData: team.yCardData || '',
      updatedAt: team.contactsUpdatedAt,
      updatedBy: team.contactsUpdatedBy
    };
  }
}; 