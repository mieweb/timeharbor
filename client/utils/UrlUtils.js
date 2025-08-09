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

  Meteor.call('extractUrlTitle', trimmedInput, (err, result) => {
    if (!err && result?.title) {
      // Find github input in the same form context
      const form = titleInput.closest('form');
      const githubInput = form?.querySelector('[name="github"]');
      
      if (githubInput) {
        githubInput.value = trimmedInput;
        titleInput.value = result.title;
        
        // Call custom success handler if provided
        if (typeof onSuccess === 'function') {
          onSuccess(result.title, trimmedInput);
        }
      }
    }
  });
};
