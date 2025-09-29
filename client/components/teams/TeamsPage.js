import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams } from '../../../collections.js';
import { getUserTeams } from '../../utils/UserTeamUtils.js';

import { parseYCard, yCardToVCard } from 'ycard';
import YAML from 'yaml';

Template.teams.onCreated(function () {
  this.showCreateTeam = new ReactiveVar(false);
  this.showJoinTeam = new ReactiveVar(false);
  this.selectedTeamId = new ReactiveVar(null);
  this.selectedTeamUsers = new ReactiveVar([]);
  this.showYCardEditor = new ReactiveVar(false);

  this.ycardContent = new ReactiveVar('');
  this.showUserSuggestions = new ReactiveVar(false);
  this.userSuggestions = new ReactiveVar([]);
  this.suggestionPosition = new ReactiveVar({ top: 0, left: 0 });
  this.currentCursorPosition = new ReactiveVar(0);

  // Initialize with proper yCard template
  this.ycardContent.set(`# yCard Format - Human-friendly contact data
people:
  - uid: "new-user"
    name: "John"
    surname: "Doe"
    title: "Team Member"
    org: "TimeHarbor"
    email: "john@gmail.com"
    phone:
      - number: "7777777777"
        type: work
    address:
      street: "1234 abby St"
      city: "Belmont"
      state: "California"
      postal_code: "444444"
      country: "USA"`);

      
   const org = parseYCard(this.ycardContent.get());
   console.log('Parsed yCard:', org);
   // Then convert to vCard
   const cards = yCardToVCard(org);
   
   console.log('Generated vCards:', cards);
      
      

  this.autorun(() => {
    const status = Meteor.status();
    if (!status.connected) {
      console.log('Meteor disconnected:', status);
    }
  });

  this.autorun(() => {
    const selectedId = this.selectedTeamId.get();
    if (selectedId) {
      this.subscribe('teamDetails', selectedId);
      const team = Teams.findOne(selectedId);
      if (team && team.members && team.members.length > 0) {
        Meteor.call('getUsers', team.members, (err, users) => {
          if (!err) {
            this.selectedTeamUsers.set(users);
          } else {
            this.selectedTeamUsers.set([]);
          }
        });
      } else {
        this.selectedTeamUsers.set([]);
      }
    } else {
      this.selectedTeamUsers.set([]);
    }
  });

  // Function to generate YAML from team members
  this.generateYAMLFromTeamMembers = () => {
    const teamId = this.selectedTeamId.get();
    if (!teamId) {
      console.log('No team selected');
      return;
    }

    Meteor.call('getUsers', null, teamId, (err, users) => {
      if (err) {
        console.error('Error fetching team members:', err);
        document.getElementById('editorStatus').textContent = 'Error loading members';
        return;
      }

      if (!users || users.length === 0) {
        document.getElementById('editorStatus').textContent = 'No members to load';
        return;
      }

      // Generate YAML content from users with full structure
      const yamlData = {
        people: users.map(user => {
          const person = {
            uid: user.id, // MongoDB generated _id
            name: user.firstName || user.username,
            surname: user.lastName || '',
            title: user.title || 'Team Member',
            org: user.organization || 'TimeHarbor',
            email: user.email || `${user.username}@timeharbor.com`
          };

          // Add phone if available
          if (user.phone && user.phone.length > 0) {
            person.phone = user.phone;
          } else {
            person.phone = [{ number: '', type: 'work' }];
          }

          // Add address if available
          if (user.address && user.address.street) {
            person.address = user.address;
          } else {
            person.address = {
              street: '',
              city: '',
              state: '',
              postal_code: '',
              country: 'USA'
            };
          }

          return person;
        })
      };

      // Convert to YAML string
      const yamlString = YAML.stringify(yamlData);
      const formattedYaml = `# yCard Format - Human-friendly contact data\n${yamlString}`;
      
      this.ycardContent.set(formattedYaml);
      document.getElementById('editorStatus').textContent = `Loaded ${users.length} team members`;
    });
  };

  this.searchUsers = (searchTerm, textareaElement) => {
    if (searchTerm.length < 2) return;
    
    Meteor.call('searchUsersByName', searchTerm, (err, users) => {
      if (!err && users) {
        this.userSuggestions.set(users);
        this.showUserSuggestions.set(users.length > 0);
        
        const rect = textareaElement.getBoundingClientRect();
        const cursorPosition = this.getCursorPosition(textareaElement);
        this.suggestionPosition.set({
          top: cursorPosition.top + 20,
          left: cursorPosition.left
        });
      }
    });
  };
  
  this.getCursorPosition = (textarea) => {
    return { top: 100, left: 20 };
  };
  
  this.fillUserData = (user) => {
    const currentContent = this.ycardContent.get();
    const lines = currentContent.split('\n');
    let personBlockStart = -1;
    
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith('- uid:')) {
        personBlockStart = i;
        break;
      }
    }
    
    if (personBlockStart !== -1) {
      const nameParts = user.username.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const newPersonBlock = [
        `  - uid: ${user._id}`,
        `    name: ${firstName}`,
        `    surname: ${lastName}`,
        `    title: ${user.profile?.title || 'Team Member'}`,
        `    org: TimeHarbor`,
        `    email: ${user.profile?.email || user.username + '@timeharbor.com'}`,
        `    phone:`,
        `      - number: ""`,
        `        type: work`,
        `    address:`,
        `      street: ""`,
        `      city: ""`,
        `      state: ""`,
        `      postal_code: ""`,
        `      country: "USA"`
      ];
      
      let personBlockEnd = personBlockStart;
      for (let i = personBlockStart + 1; i < lines.length; i++) {
        if (lines[i].trim().startsWith('- uid:') || (!lines[i].startsWith('    ') && lines[i].trim() !== '')) {
          break;
        }
        personBlockEnd = i;
      }
      
      const newLines = [
        ...lines.slice(0, personBlockStart),
        ...newPersonBlock,
        ...lines.slice(personBlockEnd + 1)
      ];
      
      this.ycardContent.set(newLines.join('\n'));
      document.getElementById('userLookupStatus').textContent = `Filled data for ${user.username}`;
    }
  };
  
  this.validateYAMLContent = () => {
    const content = this.ycardContent.get();
    try {
      const parsed = YAML.parse(content);
      if (parsed.people && Array.isArray(parsed.people)) {
        document.getElementById('editorStatus').textContent = `YAML Valid ✓ (${parsed.people.length} people)`;
      } else {
        document.getElementById('editorStatus').textContent = 'YAML Invalid - missing people array';
      }
    } catch (e) {
      document.getElementById('editorStatus').textContent = 'YAML Invalid: ' + e.message;
    }
  };
  
  this.formatYAMLContent = () => {
    const content = this.ycardContent.get();
    try {
      const parsed = YAML.parse(content);
      const formatted = YAML.stringify(parsed, { indent: 2 });
      const withComment = `# yCard Format - Human-friendly contact data\n${formatted}`;
      this.ycardContent.set(withComment);
      document.getElementById('editorStatus').textContent = 'Code formatted ✓';
    } catch (e) {
      document.getElementById('editorStatus').textContent = 'Format failed: ' + e.message;
    }
  };
  
  this.saveYCardData = () => {
    const content = this.ycardContent.get();
    const teamId = this.selectedTeamId.get();
    
    if (!teamId) {
      document.getElementById('editorStatus').textContent = 'Error: No team selected';
      return;
    }
    
    if (!Meteor.status().connected) {
      document.getElementById('editorStatus').textContent = 'Error: Not connected to server';
      return;
    }
    
    document.getElementById('editorStatus').textContent = 'Processing yCard data...';
    
    try {
      // Parse YAML to yCard format
      const yCardData = parseYCard(content);
      console.log('Parsed yCard:', yCardData);
      
      // Convert yCard to vCard
      const vCards = yCardToVCard(yCardData);
      console.log('Generated vCards:', vCards);
      
      // Save to database
      Meteor.call('saveYCardData', teamId, content, vCards, (err, result) => {
        if (err) {
          console.error('Save error:', err);
          document.getElementById('editorStatus').textContent = 'Save failed: ' + (err.reason || err.message);
        } else {
          console.log('Save result:', result);
          
          let statusMessage = result.message;
          
          if (result.errors && result.errors.length > 0) {
            statusMessage += ' Check console for error details.';
            console.warn('yCard processing errors:', result.errors);
          }
          
          document.getElementById('editorStatus').textContent = statusMessage;
          document.getElementById('userLookupStatus').textContent = 
            `Processed ${result.totalProcessed} members with vCard data`;
          
          // Refresh team data
          const currentTeamId = this.selectedTeamId.get();
          this.selectedTeamId.set(null);
          Tracker.afterFlush(() => {
            this.selectedTeamId.set(currentTeamId);
          });
        }
      });
    } catch (parseError) {
      console.error('Parse error:', parseError);
      document.getElementById('editorStatus').textContent = 'Parse failed: ' + parseError.message;
    }
  };
});

Template.teams.helpers({
  showCreateTeam() {
    return Template.instance().showCreateTeam.get();
  },
  showJoinTeam() {
    return Template.instance().showJoinTeam.get();
  },
  userTeams: getUserTeams,
  selectedTeam() {
    const id = Template.instance().selectedTeamId.get();
    const queriedTeam = id ? Teams.findOne(id) : null;
    if (!queriedTeam) return null;
    return {
      name: queriedTeam.name,
      code: queriedTeam.code,
      members: Template.instance().selectedTeamUsers.get(),
      admins: queriedTeam.admins,
      leader: queriedTeam.leader,
      createdAt: queriedTeam.createdAt,
    };
  },
  showYCardEditor() {
    return Template.instance().showYCardEditor.get();
  },
  ycardContent() {
    return Template.instance().ycardContent.get();
  },
  showUserSuggestions() {
    return Template.instance().showUserSuggestions.get();
  },
  userSuggestions() {
    return Template.instance().userSuggestions.get();
  },
  suggestionTop() {
    return Template.instance().suggestionPosition.get().top;
  },
  suggestionLeft() {
    return Template.instance().suggestionPosition.get().left;
  },
  isTeamLeader(userId, leaderId) {
    return userId === leaderId;
  }
});

Template.teams.events({
  'click #showCreateTeamForm'(e, t) {
    t.showCreateTeam.set(true);
    t.showJoinTeam && t.showJoinTeam.set(false);
  },
  'click #showJoinTeamForm'(e, t) {
    t.showJoinTeam.set(true);
    t.showCreateTeam && t.showCreateTeam.set(false);
  },
  'click #cancelCreateTeam'(e, t) {
    t.showCreateTeam.set(false);
  },
  'submit #createTeamForm'(e, t) {
    e.preventDefault();
    const teamName = e.target.teamName.value;
    Meteor.call('createTeam', teamName, (err) => {
      if (!err) {
        t.showCreateTeam.set(false);
      } else {
        alert('Error creating team: ' + err.reason);
      }
    });
  },
  'submit #joinTeamForm'(e, t) {
    e.preventDefault();
    const teamCode = e.target.teamCode.value;
    Meteor.call('joinTeamWithCode', teamCode, (err) => {
      if (!err) {
        t.showJoinTeam.set(false);
      } else {
        alert('Error joining team: ' + err.reason);
      }
    });
  },
  'click .team-link'(e, t) {
    e.preventDefault();
    t.selectedTeamId.set(e.currentTarget.dataset.id);
  },
  'click #backToTeams'(e, t) {
    t.selectedTeamId.set(null);
    t.selectedTeamUsers.set([]);
  },
  'click #copyTeamCode'(e, t) {
    const teamId = Template.instance().selectedTeamId.get();
    const joinCode = Teams.findOne(teamId)?.code;
    if (joinCode) {
      navigator.clipboard.writeText(joinCode)
        .then(() => {
          const btn = e.currentTarget;
          const originalText = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          alert('Failed to copy code to clipboard');
        });
    }
  },
  'click #toggleYCardEditor'(e, t) {
    const currentState = t.showYCardEditor.get();
    const newState = !currentState;
    t.showYCardEditor.set(newState);
    
    // Auto-generate YAML from team members when opening editor
    if (newState) {
      setTimeout(() => {
        t.generateYAMLFromTeamMembers();
      }, 100);
    }
  },
  'click #closeYCardEditor'(e, t) {
    t.showYCardEditor.set(false);
    t.showUserSuggestions.set(false);
  },
  'input #ycardEditor'(e, t) {
    const content = e.target.value;
    t.ycardContent.set(content);
    
    const cursorPosition = e.target.selectionStart;
    t.currentCursorPosition.set(cursorPosition);
    
    const lines = content.substring(0, cursorPosition).split('\n');
    const currentLine = lines[lines.length - 1];
    
    const nameMatch = currentLine.match(/name:\s*"?([^"\n]*)"?$/);
    if (nameMatch && nameMatch[1].length >= 2) {
      const searchTerm = nameMatch[1];
      t.searchUsers(searchTerm, e.target);
    } else {
      t.showUserSuggestions.set(false);
    }
  },
  'click .user-suggestion'(e, t) {
    const userId = e.currentTarget.dataset.userId;
    const selectedUser = t.userSuggestions.get().find(u => u._id === userId);
    
    if (selectedUser) {
      t.fillUserData(selectedUser);
    }
    
    t.showUserSuggestions.set(false);
  },
  'click #validateYAML'(e, t) {
    t.validateYAMLContent();
  },
  'click #formatCode'(e, t) {
    t.formatYAMLContent();
  },
  'click #resetEditor'(e, t) {
    t.ycardContent.set(`# yCard Format - Human-friendly contact data
people:
  - uid: "new-user"
    name: "John"      
    surname: "Doe"
    title: "Team Member"
    org: "TimeHarbor"
    email: "john@gmail.com"
    phone:
      - number: "7777777777"
        type: work
    address:
      street: "1234 abby St"
      city: "Belmont"
      state: "California"
      postal_code: "444444"
      country: "USA"`);
    t.showUserSuggestions.set(false);
    document.getElementById('editorStatus').textContent = 'Editor reset';
  },
  'click #saveYCardChanges'(e, t) {
    console.log('Save button clicked');
    console.log('Team ID:', t.selectedTeamId.get());
    console.log('Content length:', t.ycardContent.get().length);
    t.saveYCardData();
  }
});