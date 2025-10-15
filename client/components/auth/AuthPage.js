import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';

const authFormType = new ReactiveVar('hidden');

export const currentScreen = new ReactiveVar('authPage');

Template.authPage.onCreated(function() {
  this.loginError = new ReactiveVar('');
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
  showEmailForm: () => authFormType.get() !== 'hidden',
  loginError: () => Template.instance().loginError.get(),
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
  
  'click #showEmailForm': () => {
    authFormType.set(authFormType.get() === 'hidden' ? 'login' : 'hidden');
  },
  
  'click #at-google'(event, template) {
    event.preventDefault();
    template.loginError.set('');
    template.isLoginLoading.set(true);
    
    Meteor.loginWithGoogle({
      requestPermissions: ['email', 'profile']
    }, (err) => {
      template.isLoginLoading.set(false);
      if (err) {
        // Google login failed
        template.loginError.set(err.reason || 'Google login failed. Please try again.');
      }
    });
  },

  'click #at-github'(event, template) {
    event.preventDefault();
    template.loginError.set('');
    template.isLoginLoading.set(true);
    
    Meteor.loginWithGithub({
      requestPermissions: ['user:email']
    }, (err) => {
      template.isLoginLoading.set(false);
      if (err) {
        // GitHub login failed
        template.loginError.set(err.reason || 'GitHub login failed. Please try again.');
      }
    });
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
      if (err) alert('Signup failed: ' + err.reason);
      else currentScreen.set('mainLayout');
    });
  },
  
  'submit #loginForm'(event) {
    event.preventDefault();
    const { email, password } = event.target;
    
    Meteor.loginWithPassword(email.value.trim(), password.value, (err) => {
      if (err) alert('Login failed: ' + err.reason);
      else currentScreen.set('mainLayout');
    });
  }
});