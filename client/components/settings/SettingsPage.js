import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

// Import the HTML template
import './SettingsPage.html';

Template.settings.onCreated(function () {
    this.showOzwellConfig = new ReactiveVar(false);
    this.isConfiguring = new ReactiveVar(false);
    this.configMessage = new ReactiveVar('');
    this.configMessageType = new ReactiveVar('alert-info');
    this.ozwellSettings = new ReactiveVar({
        apiKey: '',
        baseUrl: '',
        model: '',
    });

    this.autorun(() => {
        const user = Meteor.user();
        if (user) {
            const profile = user.profile || {};
            this.ozwellSettings.set({
                apiKey: profile.ozwellApiKey || '',
                baseUrl: profile.ozwellBaseUrl || '',
                model: profile.ozwellModel || '',
            });
        }
    });
});

Template.settings.helpers({
    ozwellConfigured() {
        const user = Meteor.user();
        return user?.profile?.ozwellEnabled && user?.profile?.ozwellApiKey;
    },

    showOzwellConfig() {
        return Template.instance().showOzwellConfig.get();
    },

    isConfiguring() {
        return Template.instance().isConfiguring.get();
    },

    configMessage() {
        return Template.instance().configMessage.get();
    },

    configMessageType() {
        return Template.instance().configMessageType.get();
    },

    apiKeyInputClass() {
        return Template.instance().isConfiguring.get() ? 'input-disabled' : '';
    },

    saveButtonClass() {
        return Template.instance().isConfiguring.get() ? 'btn-disabled' : '';
    },

    cancelButtonClass() {
        const isConfiguring = Template.instance().isConfiguring.get();
        return isConfiguring ? 'btn btn-outline disabled' : 'btn btn-outline';
    },

    ozwellSettings() {
        return Template.instance().ozwellSettings.get();
    }
});

Template.settings.events({
    'click #configureOzwell'(event, template) {
        template.showOzwellConfig.set(true);
        template.configMessage.set('');
    },

    'click #cancelOzwellConfig'(event, template) {
        template.showOzwellConfig.set(false);
        template.configMessage.set('');
    },

    'click #reconfigureOzwell'(event, template) {
        template.showOzwellConfig.set(true);
        template.configMessage.set('');
    },

    'submit #ozwellConfigForm'(event, template) {
        event.preventDefault();

        const apiKey = event.target.apiKey.value.trim();
        const baseUrl = event.target.baseUrl.value.trim() || 'http://localhost:3000/v1';
        const model = event.target.model.value.trim() || 'llama3';
        if (!apiKey) {
            template.configMessage.set('Please enter an API key');
            template.configMessageType.set('alert-error');
            return;
        }

        template.isConfiguring.set(true);
        template.configMessage.set('Testing API key...');
        template.configMessageType.set('alert-info');

        Meteor.call('saveOzwellConfiguration', { apiKey, baseUrl, model }, (err) => {
            template.isConfiguring.set(false);

            if (err) {
                console.error('Failed to save Ozwell API key:', err);
                template.configMessage.set(err.reason || 'Failed to save API key');
                template.configMessageType.set('alert-error');
            } else {
                template.configMessage.set('Ozwell configured successfully! You can now use AI writing assistance.');
                template.configMessageType.set('alert-success');
                template.showOzwellConfig.set(false);

                // Clear the form
                event.target.reset();
            }
        });
    },

    'click #testOzwellConnection'(event, template) {
        template.configMessage.set('Testing connection...');
        template.configMessageType.set('alert-info');

        const user = Meteor.user();
        const apiKey = user?.profile?.ozwellApiKey;
        const baseUrl = user?.profile?.ozwellBaseUrl || 'http://localhost:3000/v1';
        const model = user?.profile?.ozwellModel || 'llama3';

        if (!apiKey) {
            template.configMessage.set('No API key configured');
            template.configMessageType.set('alert-error');
            return;
        }

        Meteor.call('testOzwellCredentials', { apiKey, baseUrl, model }, (err) => {
            if (err) {
                console.error('Ozwell connection test failed:', err);
                template.configMessage.set(err.reason || 'Connection test failed');
                template.configMessageType.set('alert-error');
            } else {
                template.configMessage.set('Connection test successful!');
                template.configMessageType.set('alert-success');
            }
        });
    },

    'click #disableOzwell'(event, template) {
        if (confirm('Are you sure you want to disable Ozwell? Your API key will be removed.')) {
            Meteor.call('updateUserProfile', {
                'profile.ozwellApiKey': null,
                'profile.ozwellEnabled': false
            }, (err) => {
                if (err) {
                    console.error('Failed to disable Ozwell:', err);
                    template.configMessage.set('Failed to disable Ozwell');
                    template.configMessageType.set('alert-error');
                } else {
                    template.configMessage.set('Ozwell has been disabled');
                    template.configMessageType.set('alert-info');
                }
            });
        }
    }
});
