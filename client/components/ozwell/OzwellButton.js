import { Template } from 'meteor/templating';

// Import the HTML template
import './OzwellButton.html';

Template.ozwellButton.events({
    'click .ozwell-btn'(event, template) {
        event.preventDefault();
        event.stopPropagation();

        // Find the associated input element
        const button = event.currentTarget;
        const immediateWrapper = button.closest('.relative, .input-group, .form-control');
        let inputElement = null;

        if (immediateWrapper) {
            const candidateList = Array.from(immediateWrapper.children).filter((element) =>
                element.matches('input[type="text"], textarea, [contenteditable="true"]')
            );
            if (candidateList.length > 0) {
                inputElement = candidateList[0];
            }
        }

        const container = !inputElement ? button.closest('.input-group, .form-control, form, .card') : null;

        if (!inputElement && container) {
            inputElement = container.querySelector('input[type="text"], textarea, [contenteditable="true"]');
        }

        // If not found, look in parent container
        if (!inputElement) {
            const parentContainer = button.closest('.card, .form-group, .field');
            if (parentContainer) {
                inputElement = parentContainer.querySelector('input[type="text"], textarea, [contenteditable="true"]');
            }
        }

        if (!inputElement) {
            alert('No text input found to assist with');
            return;
        }

        const form = button.closest('form');

        // Get context from the current page - try multiple ways
        let context = {};

        // First try to get context from current template
        if (template.getOzwellContext) {
            context = template.getOzwellContext();
        } else {
            // Try to find a parent template with the context method
            let parentTemplate = template;
            while (parentTemplate && parentTemplate.view && parentTemplate.view.parentView) {
                parentTemplate = parentTemplate.view.parentView.templateInstance ? parentTemplate.view.parentView.templateInstance() : null;
                if (parentTemplate && parentTemplate.getOzwellContext) {
                    context = parentTemplate.getOzwellContext();
                    break;
                }
            }

            // If still no context, provide a basic fallback
            if (!context.teamId) {
                // Try to get team info from the URL or current state
                const teamSelect = document.querySelector('#teamSelect');
                const teamId = teamSelect ? teamSelect.value : null;
                const teamName = teamSelect ? teamSelect.options[teamSelect.selectedIndex]?.text : 'Current Project';

                context = {
                    teamId: teamId,
                    teamName: teamName || 'Current Project',
                    user: {
                        username: Meteor.user()?.username || 'Unknown User'
                    },
                    currentTicket: null,
                    recentActivity: []
                };
            }
        }

        // Add current text from the input element
        context.currentText = inputElement.value || inputElement.textContent || '';
        context.fieldName = inputElement.getAttribute('name') || inputElement.getAttribute('id') || 'unknown-field';

        if (form) {
            const relatedFields = {};
            const formData = new FormData(form);
            formData.forEach((value, key) => {
                if (key !== context.fieldName && typeof value === 'string' && value.trim().length > 0) {
                    relatedFields[key] = value;
                }
            });
            if (Object.keys(relatedFields).length > 0) {
                context.relatedFields = relatedFields;
            }
        }

        console.log('Opening Ozwell with context:', context);

        // Open Ozwell modal
        if (window.openOzwell) {
            window.openOzwell(inputElement, context);
        } else {
            console.error('Ozwell not available');
        }
    }
});
