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

// Get start and end timestamps for a specific date
export const getDayBoundaries = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return {
    start: new Date(year, month, day, 0, 0, 0, 0).getTime(),
    end: new Date(year, month, day, 23, 59, 59, 999).getTime()
  };
};

// Get start and end timestamps for current week
export const getWeekBoundaries = () => {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Sunday
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + (6 - today.getDay())); // Saturday
  
  return {
    start: getDayBoundaries(weekStart).start,
    end: getDayBoundaries(weekEnd).end
  };
};

// Get start and end timestamps for today
export const getTodayBoundaries = () => {
  const today = new Date();
  return getDayBoundaries(today);
};
