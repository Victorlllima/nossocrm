import { supabase } from './supabase';

export const googleCalendarService = {
    /**
     * Generates the Google OAuth URL for the user to connect their calendar
     */
    async getAuthUrl() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/calendar.events',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
                redirectTo: `${window.location.origin}/api/auth/google/callback`,
            },
        });

        if (error) throw error;
        return data.url;
    },

    /**
     * Creates an event in the user's primary Google Calendar
     */
    async createEvent(dealId: string, scheduledAt: string, message: string) {
        // This will be handled by a Supabase Edge Function to keep sensitive tokens secure
        const { data, error } = await supabase.functions.invoke('google-calendar', {
            body: { action: 'create_event', dealId, scheduledAt, message },
        });

        if (error) throw error;
        return data;
    },
};
