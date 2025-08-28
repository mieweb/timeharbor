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
    return user?.emails?.[0]?.address || userId;
};