import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, Clock, MessageSquare, Send, Loader2 } from 'lucide-react';
import { Modal, ModalForm } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string | null;
  dealTitle?: string;
  onScheduled?: () => void;
}

interface FollowUpForm {
  id?: string;
  date: string;
  time: string;
  message: string;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  dealId,
  dealTitle,
  onScheduled,
}) => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FollowUpForm>({
    defaultValues: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      time: '14:00',
      message: 'Olá! Conseguiu ver aquela proposta que te enviei?',
    },
  });

  // Fetch existing pending follow-up when modal opens
  useEffect(() => {
    if (isOpen && dealId) {
      const fetchScheduled = async () => {
        try {
          const { data, error } = await supabase
            .from('scheduled_messages')
            .select('*')
            .eq('deal_id', dealId)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (data) {
            const dt = new Date(data.scheduled_at);
            setValue('id', data.id);
            setValue('date', dt.toISOString().split('T')[0]);
            setValue('time', dt.toTimeString().slice(0, 5));
            setValue('message', data.message_content);
          } else {
            // Reset defaults if no existing schedule found
            reset({
              date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
              time: '14:00',
              message: 'Olá! Conseguiu ver aquela proposta que te enviei?',
            });
          }
        } catch (err) {
          console.error('Error fetching follow-up:', err);
        }
      };
      fetchScheduled();
    }
  }, [isOpen, dealId, setValue, reset]);

  const onSubmit = async (data: FollowUpForm) => {
    if (!dealId || !profile) return;

    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(`${data.date}T${data.time}:00`);

      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('scheduled_messages')
          .update({
            scheduled_at: scheduledAt.toISOString(),
            message_content: data.message,
            // Keep status as PENDING (or potentially revert to PENDING if we re-schedule)
            status: 'PENDING',
          })
          .eq('id', data.id);

        if (error) throw error;
        addToast('Follow-up atualizado com sucesso!', 'success');
      } else {
        // Create new
        const { error } = await supabase.from('scheduled_messages').insert({
          deal_id: dealId,
          user_id: profile.id,
          scheduled_at: scheduledAt.toISOString(),
          message_content: data.message,
          status: 'PENDING',
        });

        if (error) throw error;
        addToast('Follow-up agendado com sucesso!', 'success');
      }

      reset();

      // Force UI Update
      queryClient.invalidateQueries({ queryKey: ['scheduled_messages'] });

      onScheduled?.();
      onClose();
    } catch (error: any) {
      console.error('Error scheduling follow-up:', error);
      addToast('Erro ao agendar follow-up: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agendar Follow-up Inteligente" size="md">
      <div className="mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Agende uma mensagem automática para o WhatsApp. A IA irá cancelar o envio se o cliente responder antes.
        </p>
        {dealTitle && (
          <div className="mt-2 text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-white/5 rounded inline-block">
            Negócio: {dealTitle}
          </div>
        )}
      </div>

      <ModalForm onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('id')} />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Calendar size={12} /> Data
            </label>
            <input
              type="date"
              {...register('date', { required: 'Data é obrigatória' })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Clock size={12} /> Hora
            </label>
            <input
              type="time"
              {...register('time', { required: 'Hora é obrigatória' })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <MessageSquare size={12} /> Mensagem de Follow-up
            </label>
            <select
              className="text-xs bg-transparent text-slate-500 dark:text-slate-400 hover:text-primary-600 cursor-pointer outline-none border-none p-0 focus:ring-0"
              onChange={(e) => {
                if (e.target.value) {
                  setValue('message', e.target.value);
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>✨ Modelos Rápidos</option>
              <option value="Oi [Nome], tudo certo para nossa visita amanhã às [Horário]? Te espero lá!">1. Confirmar Visita</option>
              <option value="E aí [Nome], o que achou do imóvel que vimos? Algum ponto que te preocupou ou podemos avançar?">2. Feedback Pós-Visita</option>
              <option value="Oi [Nome], conseguiu dar uma olhada nas opções que te mandei? Me diz o que achou pra eu saber se estou no caminho certo.">3. Cobrar Retorno (Sutil)</option>
              <option value="Olá [Nome], tudo bem? Ainda está procurando imóvel ou já resolveu? Se ainda estiver buscando, tenho novidades.">4. Reaquecer Lead Frio</option>
              <option value="[Nome], vou encerrar seu atendimento por enquanto pra não te incomodar. Se voltar a procurar, é só me chamar. Abraço!">5. Encerramento (Breakup)</option>
            </select>
          </div>
          <textarea
            {...register('message', { required: 'Mensagem é obrigatória' })}
            rows={4}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white"
            placeholder="O que o robô deve dizer?"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-primary-600/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {/* Change button text based on edit/create state (can't easily do it without watch, keeping generic) */}
            Agendar Follow-up
          </button>
        </div>
      </ModalForm>
    </Modal>
  );
};
