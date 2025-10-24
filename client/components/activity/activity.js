import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Meteor } from 'meteor/meteor';
import { ActivityData } from '../../../collections.js';
import './activity.html';

Template.activity.onCreated(function() {
  const instance = this;
  
  // Reactive variables
  instance.apiKey = new ReactiveVar(null);
  instance.showApiKey = new ReactiveVar(false);
  instance.copiedMessage = new ReactiveVar(false);
  instance.generatingKey = new ReactiveVar(false);
  
  instance.autorun(() => {
    instance.subscribe('myActivityData');
  });
  
  // Get user's API key on load
  Meteor.call('activitywatch.getApiKey', (error, apiKey) => {
    if (error) {
      console.error('Error getting API key:', error);
    } else {
      console.log('Got API key:', apiKey);
      instance.apiKey.set(apiKey);
    }
  });
});

Template.activity.helpers({

  isLoading() {
    return !Template.instance().subscriptionsReady();
  },
  // Get activity data from MongoDB (not from localhost:5600)
  activityData() {
    return ActivityData.findOne({ userId: Meteor.userId() });
  },
  
  // Convert buckets object to array for display
  buckets() {
    const data = ActivityData.findOne({ userId: Meteor.userId() });
    if (!data || !data.buckets) return [];
    
    return Object.keys(data.buckets).map(key => ({
      id: key,
      ...data.buckets[key]
    }));
  },
  
  // Show when data was last synced
  lastSync() {
    const data = ActivityData.findOne({ userId: Meteor.userId() });
    if (!data || !data.lastSync) return 'Never';
    
    const date = new Date(data.lastSync);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleString();
  },
  
  apiKey() {
    return Template.instance().apiKey.get();
  },
  
  showApiKey() {
    return Template.instance().showApiKey.get();
  },
  
  copiedMessage() {
    return Template.instance().copiedMessage.get();
  },
  
  generatingKey() {
    return Template.instance().generatingKey.get();
  },
  
  formatTimestamp(timestamp) {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
});

Template.activity.events({
  'click .generate-api-key'(event, instance) {
    event.preventDefault();
    
    if (instance.generatingKey.get()) return;
    
    instance.generatingKey.set(true);
    
    Meteor.call('activitywatch.generateApiKey', (error, apiKey) => {
      instance.generatingKey.set(false);
      
      if (error) {
        console.error('Error generating API key:', error);
        alert('Error generating API key: ' + error.reason);
      } else {
        console.log('Generated API key:', apiKey);
        instance.apiKey.set(apiKey);
        alert('New API key generated successfully!');
      }
    });
  },
  
  'click .toggle-api-key'(event, instance) {
    event.preventDefault();
    instance.showApiKey.set(!instance.showApiKey.get());
  },
  
  'click .copy-api-key'(event, instance) {
    event.preventDefault();
    const apiKey = instance.apiKey.get();
    
    if (apiKey) {
      navigator.clipboard.writeText(apiKey).then(() => {
        instance.copiedMessage.set(true);
        setTimeout(() => instance.copiedMessage.set(false), 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy API key');
      });
    }
  }
});