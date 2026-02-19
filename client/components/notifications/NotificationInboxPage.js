import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Notifications } from '../../../collections.js';
import { Meteor } from 'meteor/meteor';

Template.notificationInbox.onCreated(function () {
  this.subscribe('notifications.inbox');
  this.selectMode = new ReactiveVar(false);
  this.selectedIds = new ReactiveVar([]);
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
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
  },
  selectMode() {
    return Template.instance().selectMode.get();
  },
  selectButtonLabel() {
    return Template.instance().selectMode.get() ? 'Cancel' : 'Select';
  },
  isSelected(_id) {
    return (Template.instance().selectedIds.get() || []).indexOf(_id) >= 0;
  },
  hasSelected() {
    const selected = Template.instance().selectedIds.get() || [];
    return selected.length > 0;
  },
  selectedCount() {
    const selected = Template.instance().selectedIds.get() || [];
    return selected.length;
  },
  allSelected() {
    const t = Template.instance();
    const selected = t.selectedIds.get() || [];
    const total = Notifications.find().count();
    return total > 0 && selected.length === total;
  },
  totalNotifications() {
    return Notifications.find().count();
  }
});

Template.notificationInbox.events({
  'click .notification-item-wrapper'(e, t) {
    const id = e.currentTarget.dataset.notificationId;
    if (!id) return;
    
    // In select mode: toggle selection when clicking anywhere on the item
    if (t.selectMode.get()) {
      const selected = t.selectedIds.get() || [];
      const index = selected.indexOf(id);
      if (index >= 0) {
        selected.splice(index, 1);
      } else {
        selected.push(id);
      }
      t.selectedIds.set(selected);
      return;
    }
    
    // Normal mode: mark as read and navigate
    const read = e.currentTarget.dataset.read === 'true';
    const doc = Notifications.findOne(id);
    const url = doc?.data?.url;
    Meteor.call('notifications.markAsRead', id, (err) => {
      if (err) return;
      if (url && !read) FlowRouter.go(url);
    });
  },
  'click .notification-checkbox'(e, t) {
    e.stopPropagation();
    const id = e.currentTarget.dataset.notificationId;
    if (!id) return;
    const selected = t.selectedIds.get() || [];
    const index = selected.indexOf(id);
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(id);
    }
    t.selectedIds.set(selected);
  },
  'click #markAllReadBtn'() {
    Meteor.call('notifications.markAllAsRead', (err) => {
      if (err) console.error(err);
    });
  },
  'click #notificationSelectBtn'(event, t) {
    t.selectMode.set(true);
    t.selectedIds.set([]);
  },
  'click #notificationCancelSelectBtn'(event, t) {
    t.selectMode.set(false);
    t.selectedIds.set([]);
  },
  'click #notificationSelectAllBtn'(event, t) {
    const allIds = Notifications.find({}, { fields: { _id: 1 } }).fetch().map(n => n._id);
    t.selectedIds.set(allIds);
  },
  'click #notificationDeselectAllBtn'(event, t) {
    t.selectedIds.set([]);
  },
  'click #notificationClearSelection'(event, t) {
    t.selectedIds.set([]);
  },
  'click #notificationDeleteBtn'(event, t) {
    event.preventDefault();
    event.stopPropagation();
    const selected = t.selectedIds.get() || [];
    if (selected.length === 0) return;
    
    if (!confirm(`Delete ${selected.length} notification${selected.length === 1 ? '' : 's'}?`)) {
      return;
    }
    
    Meteor.call('notifications.delete', selected, (err, result) => {
      if (err) {
        console.error('Error deleting notifications:', err);
        alert('Failed to delete notifications. Please try again.');
        return;
      }
      // Clear selection and exit select mode after successful deletion
      t.selectedIds.set([]);
      t.selectMode.set(false);
    });
  }
});
