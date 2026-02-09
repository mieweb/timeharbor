/**
 * Normalize ticket reference URL (full URL or path → https://github.com/...).
 * @param {string} github - Reference link or path
 * @returns {string|null} Full URL or null if empty/invalid
 */
export function normalizeReferenceUrl(github) {
  if (!github || typeof github !== 'string') return null;
  const t = github.trim();
  if (!t) return null;
  return t.startsWith('http') ? t : `https://github.com/${t}`;
}

/**
 * Opens a URL externally. In Cordova app uses _system (device browser) via cordova-plugin-inappbrowser.
 * @param {string} href - Full URL to open
 */
export function openExternalUrl(href) {
  if (!href) return;
  try {
    if (window.cordova) {
      window.open(href, '_system');
      return;
    }
    const w = window.open(href, '_blank', 'noopener,noreferrer');
    if (!w) window.location.href = href;
  } catch (e) {
    window.location.href = href;
  }
}

/**
 * Extracts title from a URL and performs callback actions
 * @param {string} input - The URL to process
 * @param {HTMLInputElement} titleInput - The input element containing the URL
 * @param {Function} onSuccess - Optional callback for successful title extraction
 * @returns {void}
 */
export const extractUrlTitle = (input, titleInput, onSuccess) => {
  const trimmedInput = input?.trim();
  if (!trimmedInput || !(trimmedInput.startsWith('http://') || trimmedInput.startsWith('https://'))) {
    return;
  }

  // Find github input in the same form context
  const form = titleInput.closest('form');
  const githubInput = form?.querySelector('[name="github"]');

  if (githubInput) {
    // Move URL to Reference URL field
    githubInput.value = trimmedInput;

    // Add blur effect to title input
    titleInput.style.filter = 'blur(1px)';
    titleInput.style.transition = 'filter 0.3s ease';

    // Show loading indicator
    let loadingDiv = document.getElementById('title-loading-indicator');
    if (!loadingDiv) {
      loadingDiv = document.createElement('div');
      loadingDiv.id = 'title-loading-indicator';
      loadingDiv.innerHTML = '🔄 Fetching page title...';
      loadingDiv.style.marginTop = '4px';
      loadingDiv.style.fontSize = '0.9em';
      loadingDiv.style.color = '#4A5568';
      titleInput.parentNode.insertBefore(loadingDiv, titleInput.nextSibling);
    }

    Meteor.call('extractUrlTitle', trimmedInput, (err, result) => {
      if (!err && result?.title) {
  // Find github input in the same form context
  const form = titleInput.closest('form');
  const githubInput = form?.querySelector('[name="github"]');
  
  if (githubInput) {
    // Move URL to Reference URL field
    githubInput.value = trimmedInput;
    
    // Add blur effect to title input
    titleInput.style.filter = 'blur(1px)';
    titleInput.style.transition = 'filter 0.3s ease';
    
    // Show loading indicator
    let loadingDiv = document.getElementById('title-loading-indicator');
    if (!loadingDiv) {
      loadingDiv = document.createElement('div');
      loadingDiv.id = 'title-loading-indicator';
      loadingDiv.innerHTML = '🔄 Fetching page title...';
      loadingDiv.style.marginTop = '4px';
      loadingDiv.style.fontSize = '0.9em';
      loadingDiv.style.color = '#4A5568';
      titleInput.parentNode.insertBefore(loadingDiv, titleInput.nextSibling);
    }

    Meteor.call('extractUrlTitle', trimmedInput, (err, result) => {
      if (!err && result?.title) {
        titleInput.value = result.title;

        // Call custom success handler if provided
        if (typeof onSuccess === 'function') {
          onSuccess(result.title, trimmedInput);
        }
      }

      // Remove blur effect
      titleInput.style.filter = 'none';

      // Remove loading indicator
      if (loadingDiv) {
        loadingDiv.remove();
      }
    });
  }
};
      
      // Remove blur effect
      titleInput.style.filter = 'none';

      // Remove loading indicator
      if (loadingDiv) {
        loadingDiv.remove();
      }
    });
  }
};