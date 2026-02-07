import { Teams } from '../../collections.js';

// Get all teams for the current user
export const getUserTeams = () => {
    return Teams.find({members: Meteor.userId()}).fetch();
};

// Get team name from team ID
export const getTeamName = (teamId) => {
    const team = Teams.findOne(teamId);
    return team?.name || teamId;
};

// Get user email from user ID
export const getUserEmail = (userId) => {
    const user = Meteor.users?.findOne(userId);
    
    // If no user found, check if it's the current user
    if (!user && userId === Meteor.userId()) {
        const currentUser = Meteor.user();
        return currentUser?.emails?.[0]?.address || 'Unknown User';
    }
    
    if (user) {
        return user.emails?.[0]?.address ||
               user.profile?.email ||
               'Unknown User';
    }
    
    return 'Unknown User';
};

// Get user name from user ID (profile name)
export const getUserName = (userId) => {
    const user = Meteor.users?.findOne(userId);
    
    // Helper to build full name from firstName and lastName
    const getFullName = (profile) => {
        if (profile?.firstName && profile?.lastName) {
            return `${profile.firstName} ${profile.lastName}`;
        }
        if (profile?.firstName) return profile.firstName;
        if (profile?.lastName) return profile.lastName;
        return null;
    };
    
    // If no user found, check if it's the current user
    if (!user && userId === Meteor.userId()) {
        const currentUser = Meteor.user();
        return getFullName(currentUser?.profile) ||
               currentUser?.profile?.name ||
               currentUser?.username ||
               'Unknown User';
    }
    
    if (user) {
        return getFullName(user.profile) ||
               user.profile?.name || 
               user.username ||
               // Fallback: extract name from email
               (user.emails?.[0]?.address || '').split('@')[0] ||
               'Unknown User';
    }
    
    return 'Unknown User';
};