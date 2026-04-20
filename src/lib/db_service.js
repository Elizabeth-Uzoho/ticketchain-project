import { createClient } from '@supabase/supabase-js';

// 1. Database Connection Logic
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export const dbService = {
    // 2. Create a New Ticket (Off-chain storage)
    createTicket: async (ticketData) => {
        const { data, error } = await supabase
            .from('tickets') // We renamed this from 'parts'
            .insert([{
                ...ticketData,
                is_used: false,
                lastUpdated: new Date()
            }]);

        if (error) throw error;
        return data;
    },

    // 3. Find a Ticket for Verification
    getTicketBySerial: async (serial) => {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('ticket_id', serial)
            .single();

        if (error) return null;
        return data;
    }
};