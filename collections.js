import { Mongo } from 'meteor/mongo';

export const Tickets = new Mongo.Collection('tickets');
export const Teams = new Mongo.Collection('teams');
export const Sessions = new Mongo.Collection('sessions');

export const ClockEvents = new Mongo.Collection('clockevents');

// Ozwell Integration Collections
export const OzwellWorkspaces = new Mongo.Collection('ozwellworkspaces');
export const OzwellUsers = new Mongo.Collection('ozwellusers');
export const OzwellConversations = new Mongo.Collection('ozwellconversations');
