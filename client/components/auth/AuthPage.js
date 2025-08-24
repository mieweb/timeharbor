import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

// Simple state management using ReactiveVar (built-in)
const authFormType = new ReactiveVar('hidden'); // Start with hidden form

// Export for navigation
export const currentScreen = new ReactiveVar('authPage');

// Template lifecycle
Template.authPage.onCreated(function() {
  // Initialize template-specific reactive variables
  this.loginError = new ReactiveVar('');
  this.isLoginLoading = new ReactiveVar(false);
  
  // Automatic redirect when user logs in
  this.autorun(() => {
    if (Meteor.userId()) {                    // If user is logged in
      currentScreen.set('mainLayout');         // Switch to main app
    } else {                                   // If user is not logged in
      currentScreen.set('authPage');           // Show login page
    }
  });
});

// Clean template definition
Template.authPage.helpers({
  showLoginForm: () => authFormType.get() === 'login',
  showSignupForm: () => authFormType.get() === 'signup',
  showEmailForm: () => authFormType.get() !== 'hidden', // Show when not hidden
  loginError: () => Template.instance().loginError.get(),
  isLoginLoading: () => Template.instance().isLoginLoading.get()
});

Template.authPage.events({
  'click #showSignupBtn': () => authFormType.set('signup'),
  'click #showLoginBtn': () => authFormType.set('login'),
  
  // Toggle for Login with Gmail button
  'click #showEmailForm': () => {
    authFormType.set(authFormType.get() === 'hidden' ? 'login' : 'hidden');
  },
  
  // Google OAuth Login
  'click #at-google'(event, template) {
    event.preventDefault();                                    // Prevent default button behavior
    template.loginError.set('');                              // Clear any previous errors
    template.isLoginLoading.set(true);                        // Show loading state
    
    // Use Meteor's built-in Google OAuth
    Meteor.loginWithGoogle({
      requestPermissions: ['email', 'profile']                 // Request user's email and profile info
    }, (err) => {                                             // Callback function to handle result
      template.isLoginLoading.set(false);                     // Hide loading state
      if (err) {                                              // If there's an error
        console.error('Google login error:', err);            // Log error to console
        template.loginError.set(err.reason || 'Google login failed. Please try again.'); // Show user-friendly error
      } else {                                                // If login is successful
        console.log('Google login successful');               // Log success
        // The autorun in authPage will handle the redirect to main page
      }
    });
  },
  
  'submit #signupForm'(event) {
    event.preventDefault();
    const { username, password, confirmPassword } = event.target;
    
    if (password.value !== confirmPassword.value) return alert('Passwords do not match');
    if (password.value.length < 6) return alert('Password too short');
    
    Accounts.createUser({ username: username.value.trim(), password: password.value }, (err) => {
      if (err) alert('Signup failed: ' + err.reason);
      else currentScreen.set('mainLayout');
    });
  },
  
  'submit #loginForm'(event) {
    event.preventDefault();
    const { username, password } = event.target;
    
    Meteor.loginWithPassword(username.value.trim(), password.value, (err) => {
      if (err) alert('Login failed: ' + err.reason);
      else currentScreen.set('mainLayout');
    });
  }
});