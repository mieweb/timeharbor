import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { parseYCard, buildHierarchy, validateYCard, createSampleYCard } from '../../utils/YCardUtils.js';

Template.ycardEditor.onCreated(function () {
  this.showEditor = new ReactiveVar(false);
  this.showPreview = new ReactiveVar(false);
  this.yCardData = new ReactiveVar('');
  this.contacts = new ReactiveVar([]);
  this.validationErrors = new ReactiveVar([]);
  this.parsedPeople = new ReactiveVar([]);
  
  // Load existing contacts for this team
  const teamId = this.data && this.data.teamId;
  if (teamId) {
    Meteor.call('getTeamContacts', teamId, (err, result) => {
      if (!err && result) {
        this.contacts.set(result.contacts || []);
        this.yCardData.set(result.yCardData || '');
      }
    });
  }
  
  // Auto-validate when yCard data changes
  this.autorun(() => {
    const yamlText = this.yCardData.get();
    if (yamlText) {
      const errors = validateYCard(yamlText);
      this.validationErrors.set(errors);
      
      const { people } = parseYCard(yamlText);
      this.parsedPeople.set(people);
    } else {
      this.validationErrors.set([]);
      this.parsedPeople.set([]);
    }
  });
});

Template.ycardEditor.helpers({
  showEditor() {
    return Template.instance().showEditor.get();
  },
  
  showPreview() {
    return Template.instance().showPreview.get();
  },
  
  yCardData() {
    return Template.instance().yCardData.get();
  },
  
  contacts() {
    return Template.instance().contacts.get();
  },
  
  validationErrors() {
    return Template.instance().validationErrors.get();
  },
  
  parsedPeople() {
    return Template.instance().parsedPeople.get();
  },
  
  hierarchyData() {
    const people = Template.instance().showEditor.get() 
      ? Template.instance().parsedPeople.get()
      : Template.instance().contacts.get();
    return buildHierarchy(people);
  }
});

Template.ycardEditor.events({
  'click #addContacts'(e, t) {
    t.showEditor.set(true);
    t.yCardData.set(createSampleYCard());
  },
  
  'click #editContacts'(e, t) {
    t.showEditor.set(true);
  },
  
  'click #cancelEditor'(e, t) {
    t.showEditor.set(false);
    t.showPreview.set(false);
    // Reset to original data
    const teamId = t.data && t.data.teamId;
    if (teamId) {
      Meteor.call('getTeamContacts', teamId, (err, result) => {
        if (!err && result) {
          t.yCardData.set(result.yCardData || '');
        }
      });
    }
  },
  
  'click #loadSample'(e, t) {
    t.yCardData.set(createSampleYCard());
    document.getElementById('ycardTextarea').value = createSampleYCard();
  },
  
  'click #togglePreview'(e, t) {
    t.showPreview.set(!t.showPreview.get());
  },
  
  'input #ycardTextarea'(e, t) {
    t.yCardData.set(e.target.value);
  },
  
  'click #saveContacts'(e, t) {
    const teamId = t.data && t.data.teamId;
    const yamlData = t.yCardData.get();
    
    if (!teamId) {
      alert('No team selected');
      return;
    }
    
    if (!yamlData.trim()) {
      alert('Please enter yCard data');
      return;
    }
    
    const errors = t.validationErrors.get();
    if (errors.length > 0) {
      alert('Please fix validation errors before saving');
      return;
    }
    
    // Show loading state
    e.target.disabled = true;
    e.target.textContent = 'Saving...';
    
    Meteor.call('updateTeamContacts', teamId, yamlData, (err, result) => {
      // Reset button state
      e.target.disabled = false;
      e.target.textContent = 'Save Contacts';
      
      if (err) {
        alert('Error saving contacts: ' + err.reason);
        return;
      }
      
      // Update local state
      t.contacts.set(result.people);
      t.showEditor.set(false);
      t.showPreview.set(false);
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'alert alert-success fixed top-4 right-4 z-50 w-auto';
      successDiv.innerHTML = '<div>Contacts saved successfully!</div>';
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);
    });
  }
});

// Person card helpers
Template.ycardPersonCard.helpers({
  phone() {
    const phone = this.phone;
    if (Array.isArray(phone) && phone.length > 0) {
      return phone[0];
    }
    return phone;
  },
  
  substr(str, start, length) {
    if (!str) return '';
    return str.substring(start, start + length).toUpperCase();
  }
});

// Hierarchy node helpers  
Template.ycardHierarchyNode.helpers({
  substr(str, start, length) {
    if (!str) return '';
    return str.substring(start, start + length).toUpperCase();
  }
});