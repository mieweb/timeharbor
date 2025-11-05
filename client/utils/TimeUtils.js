import { currentTime } from '../components/layout/MainLayout.js';

/**
 * Formats a time duration in seconds into "H:MM:SS" format
 * @param {number} time - Time in seconds
 * @returns {string} Formatted time string
 * @example
 * formatTime(3661) // Returns "1:01:01"
 * formatTime(0) // Returns "0:00:00"
 * formatTime(999999) // Returns "277:46:39" (handles large numbers)
 */
export const formatTime = (time) => {
    if (typeof time !== 'number' || isNaN(time) || time < 0) return '0:00:00';
    
    // Handle extremely large numbers to prevent overflow
    const maxHours = 9999; // Reasonable maximum for display
    const clampedTime = Math.min(time, maxHours * 3600);
    
    const h = Math.floor(clampedTime / 3600);
    const m = Math.floor((clampedTime % 3600) / 60);
    const s = Math.floor(clampedTime % 60);
    
    // If the original time was clamped, indicate it
    if (time > maxHours * 3600) {
        return `${h}+:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Format duration in seconds to "Xh Ym Zs" format (for notifications and messages)
 * @param {number} totalSeconds - Total duration in seconds
 * @returns {string} Formatted duration string (e.g., "10h 0m 0s" or "5m 30s")
 * @example
 * formatDurationText(3661) // Returns "1h 1m 1s"
 * formatDurationText(3600) // Returns "1h"
 * formatDurationText(65) // Returns "1m 5s"
 */
export const formatDurationText = (totalSeconds) => {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
    return '0s';
  }
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
};

/**
 * Formats a timestamp into a locale-specific date string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
};

/**
 * Calculates total time for a clock event or ticket including current running time
 * @param {Object} item - Clock event or ticket object with startTimestamp and accumulatedTime
 * @returns {number} Total time in seconds
 */
export const calculateTotalTime = (item) => {
    let total = item.accumulatedTime || 0;
    if (!item.endTime && item.startTimestamp) {
        const now = currentTime.get(); // Use reactive time source
        total += Math.max(0, Math.floor((now - item.startTimestamp) / 1000));
    }
    return total;
};