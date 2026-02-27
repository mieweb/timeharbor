import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Accounts } from 'meteor/accounts-base';

export const currentScreen = new ReactiveVar('authPage');

Template.authPage.onCreated(function () {
  this.mode = new ReactiveVar('login');
  this.loginError = new ReactiveVar('');
  this.resetMessage = new ReactiveVar('');
  this.isLoading = new ReactiveVar(false);

  this.autorun(() => {
    if (Meteor.userId()) {
      currentScreen.set('mainLayout');
    } else {
      currentScreen.set('authPage');
    }
  });
});

Template.authPage.helpers({
  isLoginMode() {
    return Template.instance().mode.get() === 'login';
  },
  isSignupMode() {
    return Template.instance().mode.get() === 'signup';
  },
  isResetMode() {
    return Template.instance().mode.get() === 'reset';
  },
  loginError() {
    return Template.instance().loginError.get();
  },
  resetMessage() {
    return Template.instance().resetMessage.get();
  },
  isLoading() {
    return Template.instance().isLoading.get();
  }
});

Template.authPage.events({
  'click .toggle-password'(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const targetId = button.dataset.target;
    const input = document.getElementById(targetId);
    const eyeClosed = button.querySelector('.eye-closed');
    const eyeOpen = button.querySelector('.eye-open');

    if (input.type === 'password') {
      input.type = 'text';
      eyeClosed.classList.add('hidden');
      eyeOpen.classList.remove('hidden');
    } else {
      input.type = 'password';
      eyeClosed.classList.remove('hidden');
      eyeOpen.classList.add('hidden');
    }
  },
  'click .show-login'(event, template) {
    event.preventDefault();
    template.loginError.set('');
    template.resetMessage.set('');
    template.mode.set('login');
  },
  'click .show-signup'(event, template) {
    event.preventDefault();
    template.loginError.set('');
    template.resetMessage.set('');
    template.mode.set('signup');
  },
  'click .show-reset'(event, template) {
    event.preventDefault();
    template.loginError.set('');
    template.resetMessage.set('');
    template.mode.set('reset');
  },
  'submit #loginForm'(event, template) {
    event.preventDefault();
    const form = event.target;
    const email = form.email.value.trim();
    const password = form.password.value;

    template.loginError.set('');
    template.isLoading.set(true);

    Meteor.loginWithPassword(email, password, (err) => {
      template.isLoading.set(false);
      if (err) {
        template.loginError.set(err.reason || 'Login failed');
      } else {
        currentScreen.set('mainLayout');
        FlowRouter.go('/');
      }
    });
  },
  'submit #signupForm'(event, template) {
    event.preventDefault();
    const form = event.target;
    const firstName = form.firstName.value.trim();
    const lastName = form.lastName.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    template.loginError.set('');

    if (!firstName || !lastName) {
      template.loginError.set('First name and last name are required');
      return;
    }
    if (password !== confirmPassword) {
      template.loginError.set('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      template.loginError.set('Password too short');
      return;
    }

    template.isLoading.set(true);

    Accounts.createUser({
      email,
      password,
      profile: {
        firstName,
        lastName,
      },
    }, (err) => {
      template.isLoading.set(false);
      if (err) {
        template.loginError.set('Signup failed: ' + err.reason);
      } else {
        currentScreen.set('mainLayout');
        FlowRouter.go('/');
      }
    });
  },
  'submit #resetForm'(event, template) {
    event.preventDefault();
    const form = event.target;
    const email = form.email.value.trim();
    const teamCode = form.teamCode.value.trim();
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    template.loginError.set('');
    template.resetMessage.set('');

    if (newPassword !== confirmPassword) {
      template.loginError.set('Passwords do not match');
      return;
    }

    template.isLoading.set(true);

    Meteor.call('resetPasswordWithTeamCode', {
      email,
      teamCode,
      newPassword,
    }, (err) => {
      template.isLoading.set(false);
      if (err) {
        template.loginError.set(err.reason || err.message || 'Reset failed');
      } else {
        template.resetMessage.set('Password updated. Please log in.');
        template.mode.set('login');
        form.reset();
      }
    });
  }
});
