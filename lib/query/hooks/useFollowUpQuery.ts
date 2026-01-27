import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
        staleTime: 5 * 1000, // 5 seconds
    });
};

export const useCancelFollowUp = () => {
    return useMutation({
        mutationFn: async (messageId: string) => {
            const { error } = await supabase
                .from('scheduled_messages')
                .update({ status: 'CANCELLED_MANUAL' })
                .eq('id', messageId);

            if (error) throw error;
        }
    });
};
