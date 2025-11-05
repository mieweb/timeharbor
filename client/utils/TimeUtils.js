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