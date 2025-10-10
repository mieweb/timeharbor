import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';

// Authentication-specific reactive variables
const currentScreen = new ReactiveVar('authPage');
const isLogoutLoading = new ReactiveVar(false);
const logoutMessage = new ReactiveVar('');

// Export for use in other components
export { currentScreen, isLogoutLoading, logoutMessage };

// Wait for template to be ready before attaching events
// Removed empty onCreated block

// Auth page template events - with safety check
if (Template.authPage) {
  Template.authPage.events({
  'click #signup'(event) {
    event.preventDefault();
    // Switch to the signup form screen
    currentScreen.set('signupForm');
  },
  
  'click #login'(event) {
    event.preventDefault();
    // Switch to the login form screen
    currentScreen.set('loginForm');
  },
  
  'submit #signupForm'(event) {
    event.preventDefault();
    
    // Collect user input
    const username = event.target.username.value;
    const password = event.target.password.value;
    
    // Call server method to create a new user
    Meteor.call('createUserAccount', { username, password }, (err, result) => {
      if (err) {
        console.error('Error creating user:', err);
        alert('Failed to create user: ' + err.reason);
      } else {
        // Immediately log in as the new user
        Meteor.loginWithPassword(username, password, (loginErr) => {
          if (loginErr) {
            alert('Login failed: ' + loginErr.reason);
          } else {
            alert('User created and logged in successfully!');
            currentScreen.set('mainLayout');
          }
        });
      }
    });
  },
  
  'submit #loginForm'(event) {
    event.preventDefault();
    
    // Collect user input
    const username = event.target.username.value;
    const password = event.target.password.value;
    
    // Log in the user
    Meteor.loginWithPassword(username, password, (err) => {
      if (err) {
        console.error('Error logging in:', err);
        alert('Failed to log in: ' + err.reason);
      } else {
        alert('Logged in successfully!');
        currentScreen.set('mainLayout');
      }
    });
  },
  });
  Template.authPage.onCreated(function () {
    // Initialization logic can go here if needed in the future
    if(Meteor.userId()) {
      currentScreen.set('mainLayout');
    }
  });
}

