import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthPage from '../../../imports/ui/AuthPage';

export const currentScreen = new ReactiveVar('authPage');

Template.authPage.onCreated(function () {
  this.autorun(() => {
    if (Meteor.userId()) {
      currentScreen.set('mainLayout');
    } else {
      currentScreen.set('authPage');
    }
  });
});

Template.authPage.onRendered(function () {
  const container = document.getElementById('auth-root');
  if (!container) return;

  const root = createRoot(container);
  this._authRoot = root;

  root.render(
    React.createElement(AuthPage, {
      onSuccess: () => {
        currentScreen.set('mainLayout');
        FlowRouter.go('/');
      },
    })
  );
});

Template.authPage.onDestroyed(function () {
  if (this._authRoot) {
    this._authRoot.unmount();
    this._authRoot = null;
  }
});

Template.formField.helpers({
  emailPattern() {
    return this.type === 'email' ? '[^@]+@[^@]+\\.[^@]+' : '';
  },
  emailTitle() {
    return this.type === 'email' ? 'Please enter a valid email with domain (e.g., user@example.com)' : '';
  },
});
