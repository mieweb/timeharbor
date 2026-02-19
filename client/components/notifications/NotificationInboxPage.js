import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Notifications } from '../../../collections.js';
import { Meteor } from 'meteor/meteor';

Template.notificationInbox.onCreated(function () {
  this.subscribe('notifications.inbox');
});

Template.notificationInbox.helpers({
  notifications() {
    return Notifications.find({}, { sort: { createdAt: -1 } });
  },
  hasNotifications() {
    return Notifications.find().count() > 0;
  },
  hasUnread() {
    return Notifications.find({ read: false }).count() > 0;
  },
  isClockIn(notification) {
    const type = notification?.data?.type;
    return type === 'clock-in';
  },
  timeAgo(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
  }
});

Template.notificationInbox.events({
  'click .notification-item'(e, t) {
    const id = e.currentTarget.dataset.notificationId;
    const read = e.currentTarget.dataset.read === 'true';
    if (!id) return;
    const doc = Notifications.findOne(id);
    const url = doc?.data?.url;
    Meteor.call('notifications.markAsRead', id, (err) => {
      if (err) return;
      if (url && !read) FlowRouter.go(url);
    });
  },
  'click #markAllReadBtn'() {
    Meteor.call('notifications.markAllAsRead', (err) => {
      if (err) console.error(err);
    });
  }
});
