import { Mongo } from 'meteor/mongo';

export const Tickets = new Mongo.Collection('tickets');
export const Teams = new Mongo.Collection('teams');
export const Sessions = new Mongo.Collection('sessions');

export const ClockEvents = new Mongo.Collection('clockevents');

/** Inbox of push notifications for admins (clock-in/clock-out); same content as push, stored for in-app list */
export const Notifications = new Mongo.Collection('notifications');
