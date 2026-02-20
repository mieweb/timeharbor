import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Messages, Teams, Notifications } from '../../collections.js';
import { notifyUser } from '../utils/pushNotifications.js';
import { getUserDisplayName } from '../utils/userHelpers.js';

const buildThreadId = (teamId, adminId, memberId) => `${teamId}:${adminId}:${memberId}`;

export const messageMethods = {
  async 'messages.send'({ teamId, toUserId, text, adminId, ticketId }) {
    check(teamId, String);
    check(toUserId, String);
    check(text, String);
    check(adminId, String);
    if (ticketId !== undefined) check(ticketId, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');

    const trimmed = text.trim();
    if (!trimmed) {
      throw new Meteor.Error('validation-error', 'Message text is required');
    }

    const team = await Teams.findOneAsync({ _id: teamId });
    if (!team) throw new Meteor.Error('not-found', 'Team not found');

    const isAdmin = Array.isArray(team.admins) && team.admins.includes(this.userId);
    const isMember = Array.isArray(team.members) && team.members.includes(this.userId);

    // Only allow admin <-> member within the same team
    if (!isAdmin && !isMember) {
      throw new Meteor.Error('not-authorized', 'Not a member of this team');
    }

    // Thread must always be bound to an admin + member pair
    const memberId = isAdmin ? toUserId : this.userId;
    const threadAdminId = adminId;
    const threadId = buildThreadId(teamId, threadAdminId, memberId);

    // Enforce that sender is either the admin or the member in this thread
    if (!(this.userId === threadAdminId || this.userId === memberId)) {
      throw new Meteor.Error('not-authorized', 'Invalid thread');
    }

    // Enforce that adminId is actually an admin of the team
    if (!team.admins?.includes(threadAdminId)) {
      throw new Meteor.Error('not-authorized', 'Admin not in team');
    }

    // Enforce that member is in team
    if (!team.members?.includes(memberId) && !team.admins?.includes(memberId)) {
      throw new Meteor.Error('not-authorized', 'Member not in team');
    }

    // Get sender name for display
    const fromUser = await Meteor.users.findOneAsync(this.userId);
    const senderName = getUserDisplayName(fromUser, 'Unknown');

    const messageDoc = {
      threadId,
      teamId,
      adminId: threadAdminId,
      memberId,
      fromUserId: this.userId,
      toUserId,
      text: trimmed,
      senderName,
      createdAt: new Date()
    };
    
    // Add ticketId if provided
    if (ticketId) {
      messageDoc.ticketId = ticketId;
    }

    const messageId = await Messages.insertAsync(messageDoc);

    // Push notify recipient
    try {
      const url = `/member/${teamId}/${memberId}?adminId=${threadAdminId}`;
      const notificationData = {
        title: 'Time Harbor',
        body: `${senderName}: ${trimmed}`,
        icon: '/timeharbor-icon.png',
        badge: '/timeharbor-icon.png',
        tag: `msg-${messageId}`,
        data: {
          type: 'message',
          teamId,
          userId: memberId,
          adminId: threadAdminId,
          threadId,
          ticketId: ticketId || null,
          url
        }
      };

      await Notifications.insertAsync({
        userId: toUserId,
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data,
        read: false,
        createdAt: new Date()
      });

      await notifyUser(toUserId, {
        ...notificationData
      });
    } catch (err) {
      // Don't fail message send if push fails
      console.error('Failed to send message push:', err);
    }

    return messageId;
  }
};
