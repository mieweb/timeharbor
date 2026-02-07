/**
 * Server-side utility functions for user-related operations
 */

/**
 * Get display name from a user object
 * Priority: firstName + lastName > firstName > lastName > profile.name > username > email prefix > fallback
 * @param {Object} user - Meteor user object
 * @param {string} fallback - Fallback value if no name found (default: 'Unknown User')
 * @returns {string} The user's display name
 */
export const getUserDisplayName = (user, fallback = 'Unknown User') => {
  if (!user) return fallback;
  
  const profile = user.profile;
  
  // Check for firstName and lastName
  if (profile?.firstName && profile?.lastName) {
    return `${profile.firstName} ${profile.lastName}`;
  }
  if (profile?.firstName) return profile.firstName;
  if (profile?.lastName) return profile.lastName;
  
  // Fallback to legacy profile.name
  if (profile?.name) return profile.name;
  
  // Fallback to username
  if (user.username) return user.username;
  
  // Fallback to email prefix
  const email = user.emails?.[0]?.address;
  if (email) return email.split('@')[0];
  
  return fallback;
};

/**
 * Get user email from a user object
 * @param {Object} user - Meteor user object
 * @param {string} fallback - Fallback value if no email found (default: 'No email')
 * @returns {string} The user's email
 */
export const getUserDisplayEmail = (user, fallback = 'No email') => {
  if (!user) return fallback;
  return user.emails?.[0]?.address || user.profile?.email || fallback;
};
