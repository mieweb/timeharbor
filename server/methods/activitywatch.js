import { Meteor } from 'meteor/meteor';

import { Random } from 'meteor/random';
import { ActivityData } from '../../collections.js';



export const activitywatchMethods = {
  // Generate API key for user
  async generateApiKey() {
    const userId = this.userId;
    
    if (!userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    
    try {
      const apiKey = Random.secret(32);
      
      await Meteor.users.updateAsync(userId, {
        $set: { 'profile.apiKey': apiKey }
      });
      
      console.log('✅ API key generated for user:', userId);
      console.log('✅ API key value:', apiKey);
      return apiKey;
    } catch (error) {
      console.error(' Error in generateApiKey method:', error);
      throw new Meteor.Error('server-error', 'Failed to generate API key');
    }
  },
  
  // Get user's existing API key
  async getApiKey() {
    const userId = this.userId;
    
    if (!userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    
    try {
      const user = await Meteor.users.findOneAsync(userId);
      console.log('✅ Found user:', userId);
      console.log('✅ User profile:', user?.profile);
      return user?.profile?.apiKey || null;
    } catch (error) {
      console.error(' Error in getApiKey method:', error);
      throw new Meteor.Error('server-error', 'Failed to get API key');
    }
  },
  
  // Store activity data (called by extension via REST API)
  async storeActivityData({ buckets, events, hostname, apiKey }) {
    if (!apiKey) {
      throw new Meteor.Error('invalid-data', 'API key is required');
    }
    
    try {
      // Find user by API key
      const user = await Meteor.users.findOneAsync({ 'profile.apiKey': apiKey });
      
      if (!user) {
        throw new Meteor.Error('not-authorized', 'Invalid API key');
      }
      
      // Store the data
      await ActivityData.upsertAsync(
        { userId: user._id },
        {
          $set: {
            buckets: buckets || {},
            events: events || {},
            hostname: hostname || 'unknown',
            lastSync: new Date()
          }
        }
      );
      
      console.log(' Activity data stored for user:', user._id);
      return { success: true };
    } catch (error) {
      console.error(' Error in storeActivityData method:', error);
      throw new Meteor.Error('server-error', 'Failed to store activity data');
    }
  }
};