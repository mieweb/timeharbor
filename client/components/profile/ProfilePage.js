import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';
import { unsubscribeFromPushNotifications } from '../../utils/NotificationUtils.js';

Template.profilePage.onCreated(function () {
  this.showEditName = new ReactiveVar(false);
  this.pushDisabling = new ReactiveVar(false);
  this.githubSaving = new ReactiveVar(false);
  this._githubConnected = new ReactiveVar(false);
  this._githubLogin = new ReactiveVar('');

  // Check if GitHub is already connected
  Meteor.call('hasGitHubToken', (err, result) => {
    if (!err && result) {
      this._githubConnected.set(result.configured);
      this._githubLogin.set(result.login || '');
    }
  });

  // Listen for OAuth popup result via postMessage
  this._oauthListener = (event) => {
    if (event.data?.type !== 'github-oauth-result') return;
    if (event.data.status === 'success') {
      this._githubConnected.set(true);
      this._githubLogin.set(event.data.login || '');
    } else {
      alert('GitHub connection failed: ' + (event.data.message || 'Unknown error'));
    }
    this.githubSaving.set(false);
  };
  window.addEventListener('message', this._oauthListener);
});

Template.profilePage.onDestroyed(function () {
  if (this._oauthListener) {
    window.removeEventListener('message', this._oauthListener);
  }
});

Template.profilePage.helpers({
  pushNotificationsEnabled() {
    const user = Meteor.user();
    return !!(user?.profile?.pushSubscription);
  },
  pushDisabling() {
    return Template.instance().pushDisabling.get();
  },
  fullName() {
    const user = Meteor.user();
    if (!user?.profile) return 'Not set';
    const first = (user.profile.firstName || '').trim();
    const last = (user.profile.lastName || '').trim();
    const full = [first, last].filter(Boolean).join(' ');
    return full || 'Not set';
  },
  userEmail() {
    const user = Meteor.user();
    const email = user?.emails?.[0]?.address;
    return email || '—';
  },
  showEditName() {
    return Template.instance().showEditName.get();
  },
  editFirstName() {
    const user = Meteor.user();
    return (user?.profile?.firstName || '').trim();
  },
  editLastName() {
    const user = Meteor.user();
    return (user?.profile?.lastName || '').trim();
  },
  githubConnected() {
    return Template.instance()._githubConnected?.get() || false;
  },
  githubLogin() {
    return Template.instance()._githubLogin?.get() || '';
  },
  githubSaving() {
    return Template.instance().githubSaving.get();
  }
});

Template.profilePage.events({
  'click #editNameBtn'(e, t) {
    t.showEditName.set(true);
  },
  'click #cancelEditName'(e, t) {
    t.showEditName.set(false);
  },
  'submit #profileNameForm'(e, t) {
    e.preventDefault();
    const firstName = (e.target.firstName && e.target.firstName.value || '').trim();
    const lastName = (e.target.lastName && e.target.lastName.value || '').trim();
    if (!firstName || !lastName) {
      alert('First name and last name are required.');
      return;
    }
    Meteor.call('updateUserProfile', { firstName, lastName }, (err) => {
      if (err) {
        alert('Failed to update profile: ' + (err.reason || err.message));
        return;
      }
      t.showEditName.set(false);
    });
  },
  async 'click #profileDisablePushBtn'(e, t) {
    e.preventDefault();
    if (!confirm('Stop receiving push notifications when team members clock in/out?')) return;
    t.pushDisabling.set(true);
    try {
      await unsubscribeFromPushNotifications();
    } catch (err) {
      console.error('Failed to disable push notifications:', err);
      alert('Failed to disable. Please try again.');
    } finally {
      t.pushDisabling.set(false);
    }
  },
  'click #connectGitHubBtn'(e, t) {
    t.githubSaving.set(true);
    Meteor.call('startGitHubOAuth', (err, result) => {
      if (err) {
        t.githubSaving.set(false);
        alert('Failed to start GitHub connection: ' + (err.reason || err.message));
        return;
      }
      // Open the GitHub authorization page in a popup
      const width = 600;
      const height = 700;
      const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
      const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
      const popup = window.open(
        result.url,
        'github-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );
      // If popup was blocked, reset state
      if (!popup) {
        t.githubSaving.set(false);
        alert('Popup was blocked. Please allow popups for this site and try again.');
      }
    });
  },
  'click #disconnectGitHubBtn'(e, t) {
    if (!confirm('Disconnect GitHub? You will need to re-authorize to browse issues again.')) return;
    t.githubSaving.set(true);
    Meteor.call('removeGitHubToken', (err) => {
      t.githubSaving.set(false);
      if (err) {
        alert('Failed to disconnect: ' + (err.reason || err.message));
        return;
      }
      t._githubConnected.set(false);
      t._githubLogin.set('');
    });
  }
});
