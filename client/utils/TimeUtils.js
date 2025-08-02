import { currentTime } from '../components/layout/MainLayout.js';

/**
 * Formats a time duration in seconds into "H:MM:SS" format
 * @param {number} time - Time in seconds
 * @returns {string} Formatted time string
 * @example
 * formatTime(3661) // Returns "1:01:01"
 * formatTime(0) // Returns "0:00:00"
 */
export const formatTime = (time) => {
    if (typeof time !== 'number' || isNaN(time)) return '0:00:00';
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = time % 60;
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