import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

Template.userGuide.onCreated(function() {
  // No special setup needed for this template
});

Template.userGuide.events({
  // Tab switching functionality
  'click #teamMemberTab': (e, t) => {
    e.preventDefault();
    
    // Update tab appearance
    document.getElementById('teamMemberTab').classList.add('tab-active');
    document.getElementById('adminTab').classList.remove('tab-active');
    
    // Show/hide sections
    document.getElementById('teamMemberSection').classList.remove('hidden');
    document.getElementById('adminSection').classList.add('hidden');
  },
  
  'click #adminTab': (e, t) => {
    e.preventDefault();
    
    // Update tab appearance
    document.getElementById('adminTab').classList.add('tab-active');
    document.getElementById('teamMemberTab').classList.remove('tab-active');
    
    // Show/hide sections
    document.getElementById('adminSection').classList.remove('hidden');
    document.getElementById('teamMemberSection').classList.add('hidden');
  },
  
  // Back to home navigation
  'click #backToHome': (e, t) => {
    e.preventDefault();
    FlowRouter.go('/');
  }
});
