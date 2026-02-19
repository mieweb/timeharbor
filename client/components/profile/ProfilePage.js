import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';
import { unsubscribeFromPushNotifications } from '../../utils/NotificationUtils.js';

Template.profilePage.onCreated(function () {
  this.showEditName = new ReactiveVar(false);
  this.pushDisabling = new ReactiveVar(false);
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
  }
});
