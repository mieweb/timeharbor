import { Mongo } from 'meteor/mongo';

export const Tickets = new Mongo.Collection('tickets');
export const Teams = new Mongo.Collection('teams');
export const Sessions = new Mongo.Collection('sessions');

export const ClockEvents = new Mongo.Collection('clockevents');

// Calendar integration collections
export const CalendarConnections = new Mongo.Collection('calendarconnections');
export const CalendarEvents = new Mongo.Collection('calendarevents');
