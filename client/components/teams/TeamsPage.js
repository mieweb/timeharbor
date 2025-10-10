import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams } from '../../../collections.js';
import { getUserTeams } from '../../utils/UserTeamUtils.js';
//import { parseYCard, yCardToVCard, stringifyVCard } from 'ycard';
import YAML from 'yaml';

import './TeamsPage.html';
import './editor.js'; // Import the editor module

Template.teams.onCreated(function () {
  this.showCreateTeam = new ReactiveVar(false);
  this.showJoinTeam = new ReactiveVar(false);
  this.selectedTeamId = new ReactiveVar(null);
  this.selectedTeamUsers = new ReactiveVar([]);

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
    e.preventDefault();
    const teamId = t.selectedTeamId.get();
    
    if (!teamId) {
      alert('No team selected');
      return;
    }
    
    // Set the team ID in Session so the editor can access it
    Session.set('editorTeamId', teamId);
    
    // Open the editor modal
    setTimeout(() => {
      const modalCheckbox = document.getElementById('codemirrorEditorModal');
      if (modalCheckbox) {
        modalCheckbox.checked = true;
      }
      
      // Trigger the editor to load team data
      const editorView = Blaze.getView(document.getElementById('codemirrorEditorModal'));
      if (editorView && editorView.templateInstance) {
        const editorInstance = editorView.templateInstance();
        editorInstance.teamId.set(teamId);
        editorInstance.generateYAMLFromTeamMembers();
      }
    }, 100);
  },

  'click .download-vcard-btn'(e, t) {
    e.preventDefault();
    
    const userId = e.currentTarget.dataset.userId;
    const members = t.selectedTeamUsers.get();
    const user = members.find(member => member.id === userId);
    
    if (!user) {
      alert('User not found');
      return;
    }
    
    // Create yCard data for this single user
    const yamlData = {
      people: [{
        uid: user.id,
        name: user.firstName || user.username,
        surname: user.lastName || '',
        title: user.title || 'Team Member',
        org: user.organization || 'TimeHarbor',
        email: (user.email && user.email.length > 0) ? user.email : [""],
        phone: (user.phone && user.phone.length > 0) ? user.phone : [{ number: '', type: 'work' }],
        address: (user.address && user.address.street) ? user.address : {
          street: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'USA'
        }
      }]
    };
    
    const yamlString = YAML.stringify(yamlData);
    const ycardContent = `# yCard Format - Human-friendly contact data\n${yamlString}`;
    
    // Parse and convert to vCard
    const org = parseYCard(ycardContent);
    const cards = yCardToVCard(org);
    const vcardString = stringifyVCard(cards, '3.0');
    
    console.log('Generated vCard for ' + user.firstName + ' ' + user.lastName + ':', vcardString);
    
    const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${user.firstName}_${user.lastName}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  'click .edit-vcard-btn'(e, t) {
    e.preventDefault();
    alert("Edit vCard functionality - Coming soon!");
  },

  'click #showAddCollaboratorModal'(e, t) {
    e.preventDefault();
    const modal = document.getElementById('addCollaboratorModal');
    if (modal) {
      modal.checked = true;
    }
  },

  'click #closeAddCollaboratorModal'(e, t) {
    e.preventDefault();
    const modal = document.getElementById('addCollaboratorModal');
    if (modal) {
      modal.checked = false;
    }
  },

  'submit #addCollaboratorForm'(e, t) {
    e.preventDefault();
    
    const formData = {
      firstName: e.target.firstName.value.trim(),
      lastName: e.target.lastName.value.trim(),
      title: e.target.title.value.trim() || 'Team Member',
      organization: e.target.organization.value.trim() || 'TimeHarbor',
      email: e.target.email.value.trim(),
      phone: [{
        number: e.target.phoneNumber.value.trim() || '',
        type: e.target.phoneType.value
      }],
      address: {
        street: e.target.street.value.trim() || '',
        city: e.target.city.value.trim() || '',
        state: e.target.state.value.trim() || '',
        postal_code: e.target.postalCode.value.trim() || '',
        country: e.target.country.value.trim() || 'USA'
      }
    };
    
    const teamId = t.selectedTeamId.get();
    
    if (!teamId) {
      alert('Error: No team selected');
      return;
    }
    
    Meteor.call('addCollaboratorToTeam', teamId, formData, (err, result) => {
      if (err) {
        alert('Error adding collaborator: ' + err.reason);
      } else {
        alert('Collaborator added successfully!');
        
        // Close modal
        document.getElementById('addCollaboratorModal').checked = false;
        
        // Reset form
        e.target.reset();
        
        // Refresh team data
        const currentTeamId = t.selectedTeamId.get();
        t.selectedTeamId.set(null);
        Tracker.afterFlush(() => {
          t.selectedTeamId.set(currentTeamId);
        });
      }
    });
  }
});