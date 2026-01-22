import { Meteor } from 'meteor/meteor';

Meteor.methods({
  async 'getMyCalendarEvents'() {
    throw new Meteor.Error('disabled', 'Calendar integration is disabled.');
  }
});