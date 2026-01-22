import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

const authFormType = new ReactiveVar('login');

export const currentScreen = new ReactiveVar('authPage');

Template.authPage.onCreated(function() {
  this.loginError = new ReactiveVar('');
  this.resetMessage = new ReactiveVar('');
  this.isLoginLoading = new ReactiveVar(false);
  
  this.autorun(() => {
    if (Meteor.userId()) {
      currentScreen.set('mainLayout');
    } else {
      currentScreen.set('authPage');
    }
  });
});

Template.authPage.helpers({
  showLoginForm: () => authFormType.get() === 'login',
  showSignupForm: () => authFormType.get() === 'signup',
  showResetForm: () => authFormType.get() === 'reset',
  showEmailForm: () => true,
  loginError: () => Template.instance().loginError.get(),
  resetMessage: () => Template.instance().resetMessage.get(),
  isLoginLoading: () => Template.instance().isLoginLoading.get()
});

Template.formField.helpers({
  emailPattern() {
    return this.type === 'email' ? '[^@]+@[^@]+\\.[^@]+' : '';
  },
  emailTitle() {
    return this.type === 'email' ? 'Please enter a valid email with domain (e.g., user@example.com)' : '';
  }
});

Template.authPage.events({
  'click #showSignupBtn': () => authFormType.set('signup'),
  'click #showLoginBtn': () => authFormType.set('login'),
  'click #showResetBtn': () => authFormType.set('reset'),
  
  'click #showEmailForm': () => {
    authFormType.set(authFormType.get() === 'hidden' ? 'login' : 'hidden');
  },
  
  'submit #signupForm'(event) {
    event.preventDefault();
    const { email, password, confirmPassword } = event.target;
    
    if (password.value !== confirmPassword.value) return alert('Passwords do not match');
    if (password.value.length < 6) return alert('Password too short');
    
    Accounts.createUser({ 
      email: email.value.trim(), 
      password: password.value 
    }, (err) => {
      if (err) {
        alert('Signup failed: ' + err.reason);
      } else {
        currentScreen.set('mainLayout');
        FlowRouter.go('/');
      }
    });
  },
  
  'submit #loginForm'(event) {
    event.preventDefault();
    const { email, password } = event.target;
    
    Meteor.loginWithPassword(email.value.trim(), password.value, (err) => {
      if (err) {
        alert('Login failed: ' + err.reason);
      } else {
        currentScreen.set('mainLayout');
        FlowRouter.go('/');
      }
    });
  },
  'submit #resetForm'(event, template) {
    event.preventDefault();
    const { email, teamCode, newPassword, confirmPassword } = event.target;

    template.loginError.set('');
    template.resetMessage.set('');

    if (newPassword.value !== confirmPassword.value) {
      alert('Passwords do not match');
      return;
    }

    Meteor.call('resetPasswordWithTeamCode', {
      email: email.value.trim(),
      teamCode: teamCode.value.trim(),
      newPassword: newPassword.value
    }, (err) => {
      if (err) {
        alert('Reset failed: ' + (err.reason || err.message));
      } else {
        alert('Password updated. Please log in.');
        authFormType.set('login');
        event.target.reset();
      }
    });
  }
});