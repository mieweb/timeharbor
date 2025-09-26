import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams } from '../../../collections.js';
import { getUserTeams } from '../../utils/UserTeamUtils.js';

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

  this.ycardContent.set(`# yCard Format - Human-friendly contact data
  people:
  - uid: 
    name: ""
    surname: ""
    title: ""
    manager: null
    email: ""
    org: "TimeHarbor"
    org_unit: ""`);



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


  this.searchUsers = (searchTerm, textareaElement) => {
    if (searchTerm.length < 2) return;
    
    // Call server method to search users
    Meteor.call('searchUsersByName', searchTerm, (err, users) => {
      if (!err && users) {
        this.userSuggestions.set(users);
        this.showUserSuggestions.set(users.length > 0);
        
        // Calculate position for suggestions dropdown
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
    // Simple approximation - in real implementation you'd want more precise positioning
    return { top: 100, left: 20 };
  };
  
  this.fillUserData = (user) => {
    const currentContent = this.ycardContent.get();
    const cursorPos = this.currentCursorPosition.get();
    
    // Find the current person block and fill in the data
    const lines = currentContent.split('\n');
    let personBlockStart = -1;
    
    // Find the start of current person block
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith('- uid:')) {
        personBlockStart = i;
        break;
      }
    }
    
    if (personBlockStart !== -1) {
      // Generate user data based on database user
      const nameParts = user.username.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Replace the person block with filled data
      const newPersonBlock = [
        `  - uid: ${user.username.toLowerCase().replace(/\s+/g, '-')}`,
        `    name: "${firstName}"`,
        `    surname: "${lastName}"`,
        `    title: "${user.profile?.title || 'Team Member'}"`,
        `    manager: ${user.profile?.manager || 'null'}`,
        `    email: "${user.profile?.email || user.username + '@timeharbor.com'}"`,
        `    org: "TimeHarbor"`,
        `    org_unit: "${user.profile?.department || 'General'}"`
      ];
      
      // Find end of current person block
      let personBlockEnd = personBlockStart;
      for (let i = personBlockStart + 1; i < lines.length; i++) {
        if (lines[i].trim().startsWith('- uid:') || (!lines[i].startsWith('    ') && lines[i].trim() !== '')) {
          break;
        }
        personBlockEnd = i;
      }
      
      // Replace the block
      const newLines = [
        ...lines.slice(0, personBlockStart),
        ...newPersonBlock,
        ...lines.slice(personBlockEnd + 1)
      ];
      
      this.ycardContent.set(newLines.join('\n'));
      
      // Update status
      document.getElementById('userLookupStatus').textContent = `Filled data for ${user.username}`;
    }
  };
  
  this.validateYAMLContent = () => {
    const content = this.ycardContent.get();
    try {
      // Basic YAML validation (you might want to use a proper YAML parser)
      if (content.includes('people:')) {
        document.getElementById('editorStatus').textContent = 'YAML Valid ✓';
      } else {
        document.getElementById('editorStatus').textContent = 'YAML Invalid - missing people section';
      }
    } catch (e) {
      document.getElementById('editorStatus').textContent = 'YAML Invalid - syntax error';
    }
  };
  
  this.formatYAMLContent = () => {
    // Basic formatting - in real implementation you'd use a YAML formatter
    const content = this.ycardContent.get();
    const formatted = content.replace(/\t/g, '  '); // Replace tabs with spaces
    this.ycardContent.set(formatted);
    document.getElementById('editorStatus').textContent = 'Code formatted';
  };
  
  this.saveYCardData = () => {
  const content = this.ycardContent.get();
  const teamId = this.selectedTeamId.get();
  
  if (!teamId) {
    document.getElementById('editorStatus').textContent = 'Error: No team selected';
    return;
  }
  
  // Check if Meteor is connected
  if (!Meteor.status().connected) {
    document.getElementById('editorStatus').textContent = 'Error: Not connected to server';
    return;
  }
  
  document.getElementById('editorStatus').textContent = 'Saving...';
  
  Meteor.call('saveYCardData', teamId, content, (err, result) => {
    if (err) {
      console.error('Save error:', err);
      document.getElementById('editorStatus').textContent = 'Save failed: ' + (err.reason || err.message);
    } else {
      document.getElementById('editorStatus').textContent = 'Saved successfully ✓';
    }
  });
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
    t.selectedTeamUsers.set([]); // Clear users when going back
  },
  'click #copyTeamCode'(e, t) {
    const teamId = Template.instance().selectedTeamId.get();
    const joinCode = Teams.findOne(teamId)?.code;
    if (joinCode) {
      navigator.clipboard.writeText(joinCode)
        .then(() => {
          // Optional: Add some visual feedback
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
    // Toggle the editor visibility
    const currentState = t.showYCardEditor.get();
    t.showYCardEditor.set(!currentState);
  },
  
  
  
  'click #closeYCardEditor'(e, t) {
    t.showYCardEditor.set(false);
    t.showUserSuggestions.set(false);
  },
  
  'input #ycardEditor'(e, t) {
    const content = e.target.value;
    t.ycardContent.set(content);
    
    // Check if user is typing a name
    const cursorPosition = e.target.selectionStart;
    t.currentCursorPosition.set(cursorPosition);
    
    // Find the current line and check if it's a name field
    const lines = content.substring(0, cursorPosition).split('\n');
    const currentLine = lines[lines.length - 1];
    
    // Look for name pattern: name: "partial_name"
    const nameMatch = currentLine.match(/name:\s*"([^"]*)"?$/);
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
  - uid: 
    name: ""
    surname: ""
    title: ""
    manager: null
    email: ""
    org: "TimeHarbor"
    org_unit: ""`);
    t.showUserSuggestions.set(false);
  },
  
  'click #saveYCardChanges'(e, t) {
    console.log('Save button clicked');
    console.log('Team ID:', t.selectedTeamId.get());
    console.log('Content length:', t.ycardContent.get().length);
    t.saveYCardData();
  }



});