import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '../index';

export const useScheduledMessages = (dealId: string | undefined) => {
    return useQuery({
        queryKey: ['scheduled_messages', dealId],
        queryFn: async () => {
            if (!dealId) return [];
            const { data, error } = await supabase
                .from('scheduled_messages')
                .select('*')
                .eq('deal_id', dealId)
                .eq('status', 'PENDING')
                .order('scheduled_at', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!dealId,
        staleTime: 30 * 1000, // 30 seconds
    });
};
