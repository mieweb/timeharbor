/** Convert any _id (string or ObjectID) to a plain string */
function idStr(id) {
  if (!id) return '';
  return typeof id === 'string' ? id : (id._str || id.toHexString?.() || String(id));
}

/** Resolve a notification document by the string value stored in data-notification-id */
function findNotificationByDatasetId(datasetId) {
  if (!datasetId) return null;
  const all = Notifications.find().fetch();
  return all.find((n) => idStr(n._id) === datasetId) || null;
}

function resolveNotificationUrl(notificationDoc) {
  if (!notificationDoc) return null;

  const data = notificationDoc.data || {};
  if (data.url && typeof data.url === 'string') return data.url;

  const teamId = data.teamId;
  const userId = data.userId;
  const adminId = data.adminId;

  if (teamId && userId) {
    const base = `/member/${teamId}/${userId}`;
    return adminId ? `${base}?adminId=${adminId}` : base;
  }

  if (data.type === 'auto-clock-out') return '/tickets';
  if (data.type === 'team-invite') return '/teams';

  return null;
}

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
  isSelected() {
    const selected = Template.instance().selectedIds.get() || [];
    return selected.includes(idStr(this._id));
  },
  hasSelected() {
    return (Template.instance().selectedIds.get() || []).length > 0;
  },
  selectedCount() {
    return (Template.instance().selectedIds.get() || []).length;
  },
  allSelected() {
    const selected = Template.instance().selectedIds.get() || [];
    const total = Notifications.find().count();
    return total > 0 && selected.length === total;
  },
  notificationId(id) {
    return idStr(id);
  },
});

Template.notificationInbox.events({
  'click .notification-item-wrapper'(e, t) {
    const id = e.currentTarget.dataset.notificationId;
    if (!id) return;

    // In select mode: toggle selection
    if (t.selectMode.get()) {
      const selected = [...(t.selectedIds.get() || [])];
      const index = selected.indexOf(id);
      if (index >= 0) {
        selected.splice(index, 1);
      } else {
        selected.push(id);
      }
      t.selectedIds.set(selected);
      return;
    }

    // Normal mode: mark as read
    const doc = findNotificationByDatasetId(id);
    const url = resolveNotificationUrl(doc);
    Meteor.call('notifications.markAsRead', doc?._id || id, (err) => {
      if (err) return;
      if (url) FlowRouter.go(url);
    });
  },
  'click .notification-checkbox'(e, t) {
    e.stopPropagation();
    const id = e.currentTarget.dataset.notificationId;
    if (!id) return;
    const selected = [...(t.selectedIds.get() || [])];
    const index = selected.indexOf(id);
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(id);
    }
    t.selectedIds.set(selected);
  },
  'click #markAllReadBtn'() {
    Meteor.call('notifications.markAllAsRead');
  },
  'click #notificationSelectBtn'(e, t) {
    t.selectMode.set(true);
    t.selectedIds.set([]);
  },
  'click #notificationCancelSelectBtn'(e, t) {
    t.selectMode.set(false);
    t.selectedIds.set([]);
  },
  'click #notificationSelectAllBtn'(e, t) {
    const allIds = Notifications.find({}, { fields: { _id: 1 } }).fetch().map(n => idStr(n._id));
    t.selectedIds.set(allIds);
  },
  'click #notificationDeselectAllBtn'(e, t) {
    t.selectedIds.set([]);
  },
  'click #notificationDeleteBtn'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    const selected = [...(t.selectedIds.get() || [])];
    if (selected.length === 0) return;

    Meteor.call('notifications.delete', selected, (err) => {
      if (err) {
        console.error('Error deleting notifications:', err);
        return;
      }
      t.selectedIds.set([]);
      // Stay in select mode so user can continue selecting if desired
      if (Notifications.find().count() === 0) {
        t.selectMode.set(false);
      }
    });
  },
});
