/**
 * Shared date utilities for consistent date handling across components
 */

// Format date to YYYY-MM-DD string
export const dateToLocalString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's date
export const getToday = () => new Date();

// Get yesterday's date
export const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
};

// Get date N days ago
export const getDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Get this week's start (Monday)
export const getThisWeekStart = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
  date.setDate(diff);
  return date;
};

// Parse date string and return localized date string for display
export const formatDateForDisplay = (dateString) => {
  const dateParts = dateString.split('-');
  const localDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  return localDate.toLocaleDateString();
};
