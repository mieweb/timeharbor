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

// Get username from user ID
export const getUserName = (userId) => {
    const user = Meteor.users?.findOne(userId);
    return user?.username || userId;
};