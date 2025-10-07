import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import axios from 'axios';

export const referenceAssistantMethods = {
    async callReferenceAssistant(params) {
        check(params, {
            messages: [Match.ObjectIncluding({
                role: String,
                content: String,
            })],
            metadata: Match.Maybe(Object),
            options: Match.Maybe(Object),
        });

        if (!this.userId) throw new Meteor.Error('not-authorized');

        const user = await Meteor.users.findOneAsync(this.userId);
        const profile = user?.profile || {};

        const baseUrl = params.options?.baseUrl || profile.ozwellBaseUrl || Meteor.settings?.referenceServer?.baseUrl || process.env.REFERENCE_SERVER_BASE_URL || 'http://localhost:3000/v1';
        const apiKey = params.options?.apiKey || profile.ozwellApiKey || process.env.REFERENCE_SERVER_API_KEY;
        const model = params.options?.model || profile.ozwellModel || Meteor.settings?.referenceServer?.model || process.env.REFERENCE_SERVER_MODEL || 'llama3';

        if (!apiKey) {
            throw new Meteor.Error('reference-server-config-missing', 'Please add your Ozwell API key in Settings.');
        }

        try {
            const url = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;
            const { data } = await axios.post(url, {
                model,
                messages: params.messages,
                ...params.options,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
            });
            const content = data?.choices?.[0]?.message?.content;

            if (!content) {
                throw new Meteor.Error('reference-server-empty', 'Reference server returned no content');
            }

            return {
                content: content.trim(),
                raw: data,
            };
        } catch (error) {
            if (error instanceof Meteor.Error) {
                throw error;
            }

            const errorMessage = error.response?.data?.error || error.response?.data || error.message;
            throw new Meteor.Error('reference-server-unavailable', errorMessage || 'Failed to reach reference server');
        }
    },
};
